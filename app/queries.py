from __future__ import annotations

import logging
import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Callable, TypeVar, Iterable, Optional

from psycopg2 import InterfaceError, OperationalError
from psycopg2.extras import RealDictCursor

from .constants import (
    CATEGORY_SUMMER,
    CATEGORY_WINTER,
    CATEGORY_SEASONAL,
    CATEGORY_VNR_CODES,
    CATEGORY_VNR_LABEL,
    TABLE_CONTRACT_EXECUTED,
    TABLE_CONTRACT_TOTAL,
    TABLE_FACT_AGG,
    TABLE_PLAN_AGG,
    TABLE_PLAN_VS_FACT_MONTHLY,
    TABLE_RATES,
    UNTITLED_WORK_LABEL,
)
from .db import get_connection
from .retry import db_retry
from .models import (
    DashboardItem,
    DashboardSummary,
    DailyReportItem,
    DailyReportResponse,
    DailyRevenue,
    DailyWorkVolume,
)
from .query_builder import FactQueryBuilder
from .utils import (
    to_float,
    normalize_string,
    get_month_start,
    get_next_month_start,
    extract_dict_strings,
)

logger = logging.getLogger(__name__)


_PLAN_BASE_CATEGORIES = CATEGORY_SEASONAL
_VNR_CATEGORY_CODES = CATEGORY_VNR_CODES
_VNR_PLAN_SHARE = Decimal("0.43")

_DB_RETRYABLE_ERRORS = (OperationalError, InterfaceError)
_DB_RETRY_DELAY_SEC = 0.7
_DB_RETRY_BACKOFF = 1.0  # Можно увеличить (>1.0) для экспоненциальной задержки

T = TypeVar("T")


ITEMS_SQL = f"""
    SELECT
        pvf.*
    FROM {TABLE_PLAN_VS_FACT_MONTHLY} AS pvf
    WHERE pvf.month_start = %s
    ORDER BY ABS(COALESCE(pvf.delta_amount_done, 0)) DESC, pvf.description;
"""

AVAILABLE_MONTHS_SQL = f"""
    SELECT DISTINCT month_start
    FROM {TABLE_PLAN_VS_FACT_MONTHLY}
    WHERE planned_amount IS NOT NULL OR fact_amount_done IS NOT NULL
    ORDER BY month_start DESC
    LIMIT %s;
"""

LAST_UPDATED_SQL = f"""
    SELECT COALESCE(MAX(loaded_at), 'epoch'::timestamptz) AS last_updated
    FROM (
        SELECT loaded_at FROM {TABLE_FACT_AGG}
        UNION ALL
        SELECT loaded_at FROM {TABLE_PLAN_AGG}
    ) AS loads;
"""

CONTRACT_TOTAL_SQL = f"""
    SELECT COALESCE(SUM(contract_amount), 0) AS contract_total
    FROM {TABLE_CONTRACT_TOTAL};
"""

CONTRACT_EXECUTED_SQL = f"""
    SELECT COALESCE(SUM(category_amount), 0) AS executed_total
    FROM {TABLE_CONTRACT_EXECUTED};
"""

SUMMARY_SQL = f"""
    WITH agg AS (
        SELECT
            SUM(CASE
                    WHEN COALESCE(TRIM(LOWER(smeta_code)), '') IN ('внерегл_ч_1', 'внерегл_ч_2')
                        THEN 0
                    ELSE planned_amount
                END) AS planned_total,
            SUM(fact_amount_done) AS fact_total
        FROM {TABLE_PLAN_VS_FACT_MONTHLY}
        WHERE month_start = %s
    )
    SELECT
        planned_total,
        fact_total,
        CASE WHEN planned_total <> 0 THEN fact_total / planned_total END AS completion_pct,
        fact_total - planned_total AS delta_amount
    FROM agg;
"""


"""Функции получения данных из БД.

Все публичные функции ниже помечены декоратором `@db_retry` для повторных 
попыток при временных ошибках соединения/курсов (OperationalError, InterfaceError).
"""


 


# Функции _to_float, _safe_get_from_row и _extract_strings перенесены в utils.py
# Используются: to_float, safe_get_from_dict, extract_dict_strings


def _aggregate_items_streaming(cursor) -> list[DashboardItem]:
    """
    Агрегирует строки запроса используя курсор напрямую (потоковая обработка).
    Минимизирует использование памяти для больших результатов.
    Cursor должен быть RealDictCursor и находиться в контексте транзакции.
    """

    items_map: dict[tuple[str | None, str], dict[str, Any]] = {}

    for row in cursor:
        smeta_code, work_name, unit = extract_dict_strings(row)
        description = work_name or unit or UNTITLED_WORK_LABEL
        key = (smeta_code, description)
        month_start = row.get("month_start")

        item = items_map.get(key)
        if item is None:
            item = {
                "month_start": month_start,
                "smeta": smeta_code,
                "work_name": description,
                "planned_amount": None,
                "fact_amount": None,
            }
            items_map[key] = item
        else:
            if item.get("month_start") is None:
                item["month_start"] = month_start

        planned_value = to_float(row.get("planned_amount"))
        smeta_normalized = normalize_string(smeta_code, default="")
        if smeta_normalized not in _VNR_CATEGORY_CODES and planned_value is not None:
            item["planned_amount"] = (item["planned_amount"] or 0.0) + planned_value

        fact_value = to_float(row.get("fact_amount_done"))
        if fact_value is not None:
            item["fact_amount"] = (item["fact_amount"] or 0.0) + fact_value

    aggregated_items: list[DashboardItem] = []
    for item in items_map.values():
        smeta_normalized = normalize_string(item.get("smeta"), default="")
        planned_value = item.get("planned_amount")
        if smeta_normalized in _VNR_CATEGORY_CODES:
            planned_value = 0.0

        aggregated_items.append(
            DashboardItem(
                month_start=item.get("month_start"),
                smeta=item.get("smeta"),
                work_name=item.get("work_name"),
                planned_amount=planned_value,
                fact_amount=item.get("fact_amount"),
            )
        )

    return aggregated_items


def _fetch_dates(
    conn,
    sql: str,
    params: tuple[Any, ...] | None = None,
    *,
    cursor_factory=None,
) -> list[date]:
    """Вспомогательная утилита для выборки списка дат/месяцев.

    Выполняет переданный SQL, читает все строки и возвращает
    плоский список первых столбцов, отфильтровывая None.
    """

    with conn.cursor(cursor_factory=cursor_factory) as cur:
        cur.execute(sql, params or ())
        rows: Iterable[Optional[tuple]] = cur.fetchall() or []
    return [row[0] for row in rows if row and row[0] is not None]


def _fetch_daily_fact_totals(conn, month_start: date) -> list[DailyRevenue]:
    """Извлекает дневные суммы фактических работ используя билдер."""
    daily_rows: list[DailyRevenue] = []
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        try:
            sql, params = (
                FactQueryBuilder()
                .select(
                    "date_done::date AS work_date",
                    "SUM(total_amount) AS fact_total",
                )
                .month_start(month_start)
                .status()
                .group_by("work_date")
                .having("SUM(total_amount) IS NOT NULL")
                .order_by("work_date")
                .build()
            )
            cur.execute(sql, params)
            rows = cur.fetchall() or []
            for row in rows:
                amount = to_float(row.get("fact_total"))
                work_date = row.get("work_date")
                if amount is None or work_date is None:
                    continue
                daily_rows.append(DailyRevenue(date=work_date, amount=amount))
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Не удалось загрузить дневные суммы за %s: %s. Используется пустой список.",
                month_start,
                exc,
                exc_info=True,
            )
            conn.rollback()
            return []

    return daily_rows


 


@db_retry(
    retries=1,
    delay_sec=_DB_RETRY_DELAY_SEC,
    backoff=_DB_RETRY_BACKOFF,
    exceptions=_DB_RETRYABLE_ERRORS,
    label="fetch_work_daily_breakdown",
)
def fetch_work_daily_breakdown(month_start: date, work_identifier: str) -> list[DailyWorkVolume]:
    """Возвращает список по-дневных объёмов (total_volume) для указанной строки работ за месяц.

    В результате возвращается список объектов с полями `date`, `amount` и `unit`.
    Поиск выполняется по полю `description` с приведением к нижнему регистру (ILIKE).
    """

    results: list[DailyWorkVolume] = []
    if not work_identifier:
        return results

    # На фронтенд может прийти любая дата внутри месяца, поэтому нормализуем
    # значение к первому дню месяца, чтобы захватывать весь период.
    month_start = get_month_start(month_start)

    rows: list[DailyWorkVolume] = []
    next_month_start = get_next_month_start(month_start)
    with get_connection() as conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                work_param = f"%{work_identifier.strip()}%"
                sql, params = (
                    FactQueryBuilder()
                    .select(
                        "date_done::date AS work_date",
                        "SUM(COALESCE(total_volume, 0)) AS total_volume",
                        "MAX(COALESCE(unit::text, '')) AS unit",
                        "SUM(COALESCE(total_amount, 0)) AS total_amount",
                    )
                    .date_range(month_start, next_month_start)
                    .status()
                    .ilike_description(work_param)
                    .group_by("work_date")
                    .order_by("work_date")
                    .build()
                )
                cur.execute(sql, params)
                fetched = cur.fetchall() or []
                for row in fetched:
                    work_date = row.get("work_date")
                    vol = to_float(row.get("total_volume"))
                    unit = normalize_string(row.get("unit"))
                    total_amount = to_float(row.get("total_amount"))
                    if work_date is None or vol is None:
                        continue
                    rows.append(
                        DailyWorkVolume(
                            date=work_date,
                            amount=vol,
                            unit=unit,
                            total_amount=total_amount,
                        )
                    )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Не удалось загрузить подневную расшифровку для '%s' за %s: %s",
                work_identifier,
                month_start,
                exc,
                exc_info=True,
            )
            conn.rollback()
            return []
    return rows


def _fetch_contract_progress(conn, _selected_month: date) -> dict[str, float] | None:
    """Возвращает агрегаты по контракту и выполнению, логирует и возвращает None при ошибке."""

    # Для карточки «Выполнение контракта» факты текущего месяца должны
    # рассчитываться относительно реального текущего календарного месяца,
    # а не выбранного пользователем периода. Поэтому месяц получения данных
    # вычисляем от сегодняшней даты.
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(CONTRACT_TOTAL_SQL)
            contract_row = cur.fetchone() or {}
            contract_total = to_float(contract_row.get("contract_total")) or 0.0

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(CONTRACT_EXECUTED_SQL)
            executed_row = cur.fetchone() or {}
            executed_total = to_float(executed_row.get("executed_total")) or 0.0

        return {
            "contract_total": contract_total,
            "executed_total": executed_total,
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Не удалось загрузить агрегаты по контракту за %s: %s",
            date.today().replace(day=1),
            exc,
            exc_info=True,
        )
        conn.rollback()
        return None


def _calculate_daily_average(
    month_start: date,
    daily_rows: list[DailyRevenue],
    fact_total: float | None,
) -> float | None:
    """Вычисляет среднедневную выручку для выбранного месяца."""
    today = date.today()
    current_month_start = today.replace(day=1)

    # Для прошлых месяцев: берём явный fact_total если он есть,
    # иначе суммируем доступные дневные записи. Если данных нет — возвращаем None.
    if month_start != current_month_start:
        if fact_total is not None:
            total = fact_total
        else:
            total = sum((row.amount for row in daily_rows if row.amount is not None), 0.0)

        if total == 0.0:
            return None

        days_in_month = calendar.monthrange(month_start.year, month_start.month)[1]
        return total / days_in_month

    # Для текущего месяца: усредняем по доступным дням, исключая данные за сегодня.
    if not daily_rows:
        return None

    past_days_amounts = [row.amount for row in daily_rows if row.amount is not None and row.date != today]
    if not past_days_amounts:
        return None

    return sum(past_days_amounts) / len(past_days_amounts)


@db_retry(
    retries=1,
    delay_sec=_DB_RETRY_DELAY_SEC,
    backoff=_DB_RETRY_BACKOFF,
    exceptions=_DB_RETRYABLE_ERRORS,
    label="fetch_plan_vs_fact_for_month",
)
def fetch_plan_vs_fact_for_month(
    month_start: date,
) -> tuple[list[DashboardItem], DashboardSummary | None, datetime | None]:
    """
    Читает данные из view skpdi_plan_vs_fact_monthly для конкретного месяца
    и собирает summary. Использует потоковую обработку для оптимизации памяти.
    Возвращает: (items, summary, last_updated)
    """
    items: list[DashboardItem]

    summary = None
    last_updated = None
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(ITEMS_SQL, (month_start,))
            items_raw = cur.fetchall()

        # Агрегация по категориям
            plan_leto = sum(
                to_float(row["planned_amount"]) or 0.0
                for row in items_raw
                if normalize_string(row["smeta_code"], "") == CATEGORY_SUMMER
            )
            plan_zima = sum(
                to_float(row["planned_amount"]) or 0.0
                for row in items_raw
                if normalize_string(row["smeta_code"], "") == CATEGORY_WINTER
            )
            plan_vnereglament = (plan_leto + plan_zima) * float(_VNR_PLAN_SHARE)
            plan_total = plan_leto + plan_zima + plan_vnereglament

            fact_leto = sum(
                to_float(row["fact_amount_done"]) or 0.0
                for row in items_raw
                if normalize_string(row["smeta_code"], "") == CATEGORY_SUMMER
            )
            fact_zima = sum(
                to_float(row["fact_amount_done"]) or 0.0
                for row in items_raw
                if normalize_string(row["smeta_code"], "") == CATEGORY_WINTER
            )
            fact_vnereglament = sum(
                to_float(row["fact_amount_done"]) or 0.0
                for row in items_raw
                if normalize_string(row["smeta_code"], "") in CATEGORY_VNR_CODES
            )
            fact_total = fact_leto + fact_zima + fact_vnereglament

            # Для SummaryCards
            summary = {
                "planned_amount": plan_total,
                "fact_amount": fact_total,
                "delta_amount": fact_total - plan_total,
            }

            # Среднедневное значение
            today = date.today()
            days_in_month = calendar.monthrange(month_start.year, month_start.month)[1]
            if month_start.year == today.year and month_start.month == today.month:
                days_with_data = today.day - 1
            else:
                days_with_data = days_in_month
            summary["average_daily"] = fact_total / days_with_data if days_with_data > 0 else 0.0
            summary["days_with_data"] = days_with_data

            # Для SmetaCategories
            smeta_categories = [
                {
                    "key": "лето",
                    "title": "Лето",
                    "planned": plan_leto,
                    "fact": fact_leto,
                    "delta": fact_leto - plan_leto,
                },
                {
                    "key": "зима",
                    "title": "Зима",
                    "planned": plan_zima,
                    "fact": fact_zima,
                    "delta": fact_zima - plan_zima,
                },
                {
                    "key": "внерегламент",
                    "title": "Внерегламент",
                    "planned": plan_vnereglament,
                    "fact": fact_vnereglament,
                    "delta": fact_vnereglament - plan_vnereglament,
                },
            ]

            # Для WorkBreakdownList
            work_items = []
            for desc in set(row["description"] for row in items_raw):
                for cat in ["лето", "зима", "внерегламент"]:
                    if cat == "внерегламент":
                        planned = 0
                        fact = sum(
                            to_float(row["fact_amount_done"]) or 0.0
                            for row in items_raw
                            if normalize_string(row["smeta_code"], "") in CATEGORY_VNR_CODES and row["description"] == desc
                        )
                    else:
                        planned = sum(
                            to_float(row["planned_amount"]) or 0.0
                            for row in items_raw
                            if normalize_string(row["smeta_code"], "") == cat and row["description"] == desc
                        )
                        fact = sum(
                            to_float(row["fact_amount_done"]) or 0.0
                            for row in items_raw
                            if normalize_string(row["smeta_code"], "") == cat and row["description"] == desc
                        )
                        if planned > 1 or fact > 1:
                            # Найдём первую строку для desc и cat, чтобы взять month_start и smeta_code
                            row_match = next((row for row in items_raw if row["description"] == desc and (
                                (cat == "внерегламент" and normalize_string(row["smeta_code"], "") in CATEGORY_VNR_CODES) or
                                (cat != "внерегламент" and normalize_string(row["smeta_code"], "") == cat)
                            )), None)
                            work_items.append({
                                "month_start": row_match["month_start"] if row_match else None,
                                "smeta": row_match["smeta_code"] if row_match else None,
                                "work_name": desc,
                                "category": cat,
                                "description": desc,
                                "planned_amount": planned,
                                "fact_amount": fact,
                                "delta": fact - planned,
                            })

            # last_updated
            last_updated = _fetch_last_updated(conn)

        # Возвращаем все агрегаты для фронта
        return work_items, summary, last_updated, smeta_categories


@db_retry(
    retries=1,
    delay_sec=_DB_RETRY_DELAY_SEC,
    backoff=_DB_RETRY_BACKOFF,
    exceptions=_DB_RETRYABLE_ERRORS,
    label="fetch_available_months",
)
def fetch_available_months(limit: int = 12) -> list[date]:
    """Возвращает список месяцев, за которые есть данные."""
    with get_connection() as conn:
        return _fetch_dates(conn, AVAILABLE_MONTHS_SQL, (limit,))


@db_retry(
    retries=1,
    delay_sec=_DB_RETRY_DELAY_SEC,
    backoff=_DB_RETRY_BACKOFF,
    exceptions=_DB_RETRYABLE_ERRORS,
    label="fetch_available_days",
)
def fetch_available_days() -> list[date]:
    """Возвращает список дат текущего месяца (через билдер), по которым есть фактические данные."""
    with get_connection() as conn:
        sql, params = (
            FactQueryBuilder()
            .distinct()
            .select("date_done::date AS work_date")
            .current_month()
            .status()
            .order_by("work_date DESC")
            .build()
        )
        return _fetch_dates(conn, sql, params)


@db_retry(
    retries=1,
    delay_sec=_DB_RETRY_DELAY_SEC,
    backoff=_DB_RETRY_BACKOFF,
    exceptions=_DB_RETRYABLE_ERRORS,
    label="fetch_daily_report",
)
def fetch_daily_report(target_date: date) -> DailyReportResponse:
    """Возвращает детализацию фактических работ за выбранный день, используя билдер."""
    target_date = target_date or date.today()

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            sql, params = (
                FactQueryBuilder()
                .select(
                    "COALESCE(smeta_code, '') AS smeta_code",
                    "COALESCE(smeta_section, '') AS smeta_section",
                    "COALESCE(description, '') AS description",
                    "unit",
                    "SUM(total_volume) AS total_volume",
                    "SUM(total_amount) AS total_amount",
                )
                .date_equals(target_date)
                .status()
                .group_by("smeta_code", "smeta_section", "description", "unit")
                .order_by("total_amount DESC NULLS LAST", "description")
                .build()
            )
            cur.execute(sql, params)
            rows = cur.fetchall() or []

        last_updated = _fetch_last_updated(conn)

    items: list[DailyReportItem] = []
    for row in rows:
        items.append(
            DailyReportItem(
                smeta=normalize_string(row.get("smeta_code")) or None,
                work_type=normalize_string(row.get("smeta_section")) or None,
                description=normalize_string(row.get("description"), default="Без названия"),
                unit=normalize_string(row.get("unit")) or None,
                total_volume=to_float(row.get("total_volume")),
                total_amount=to_float(row.get("total_amount")),
            )
        )

    return DailyReportResponse(
        date=target_date,
        last_updated=last_updated,
        items=items,
        has_data=bool(items),
    )


def _fetch_last_updated(conn) -> datetime | None:
    """Возвращает максимальный loaded_at из агрегаций или None."""

    with conn.cursor() as cur:
        cur.execute(LAST_UPDATED_SQL)
        res = cur.fetchone()
        if not res:
            return None
        return res[0]
