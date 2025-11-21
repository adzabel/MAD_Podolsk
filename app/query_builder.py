from __future__ import annotations

"""Утилитарный билдер SQL-запросов для таблицы фактов `skpdi_fact_with_money`.

Цель: сократить дублирование похожих запросов (фильтры по дате, статусу,
поиску по описанию, группировке) в `queries.py`.

Билдер НЕ претендует на полноту ORM. Он генерирует простые SQL-строки
с параметрами (placeholders %s) для использования с psycopg2.
"""

from typing import List, Tuple


class FactQueryBuilder:
    """Fluent-билдер для запросов к `skpdi_fact_with_money`.

    Пример использования:

        sql, params = (
            FactQueryBuilder()
            .select("date_done::date AS work_date", "SUM(total_amount) AS fact_total")
            .month_start(month_start)
            .status("Рассмотрено")
            .group_by("work_date")
            .having("SUM(total_amount) IS NOT NULL")
            .order_by("work_date")
            .build()
        )
    """

    TABLE = "skpdi_fact_with_money"

    def __init__(self) -> None:
        self._select: List[str] = []
        self._where: List[str] = []
        self._group_by: List[str] = []
        self._order_by: List[str] = []
        self._having: List[str] = []
        self._distinct: bool = False
        self._params: List[object] = []

    # ---- Select ----
    def select(self, *columns: str) -> "FactQueryBuilder":
        self._select.extend([c for c in columns if c])
        return self

    def distinct(self) -> "FactQueryBuilder":
        self._distinct = True
        return self

    # ---- Where helpers ----
    def month_start(self, month_start) -> "FactQueryBuilder":
        self._where.append("month_start = %s")
        self._params.append(month_start)
        return self

    def date_equals(self, day) -> "FactQueryBuilder":
        self._where.append("date_done::date = %s")
        self._params.append(day)
        return self

    def current_month(self) -> "FactQueryBuilder":
        self._where.append("date_trunc('month', date_done) = date_trunc('month', CURRENT_DATE)")
        return self

    def date_range(self, start, end) -> "FactQueryBuilder":
        self._where.append("date_done::date >= %s")
        self._where.append("date_done::date < %s")
        self._params.extend([start, end])
        return self

    def status(self, value: str = "Рассмотрено") -> "FactQueryBuilder":
        self._where.append("status = %s")
        self._params.append(value)
        return self

    def ilike_description(self, pattern: str) -> "FactQueryBuilder":
        self._where.append("COALESCE(description::text, '') ILIKE %s")
        self._params.append(pattern)
        return self

    def raw_where(self, clause: str) -> "FactQueryBuilder":
        if clause:
            self._where.append(clause)
        return self

    # ---- Group / Having / Order ----
    def group_by(self, *cols: str) -> "FactQueryBuilder":
        self._group_by.extend([c for c in cols if c])
        return self

    def having(self, *clauses: str) -> "FactQueryBuilder":
        self._having.extend([c for c in clauses if c])
        return self

    def order_by(self, *cols: str) -> "FactQueryBuilder":
        self._order_by.extend([c for c in cols if c])
        return self

    # ---- Build ----
    def build(self) -> Tuple[str, Tuple[object, ...]]:
        if not self._select:
            raise ValueError("SELECT список не может быть пустым")

        select_kw = "SELECT DISTINCT" if self._distinct else "SELECT"
        sql_parts = [
            f"{select_kw} \n    " + ",\n    ".join(self._select),
            f"FROM {self.TABLE}",
        ]

        if self._where:
            sql_parts.append("WHERE " + "\n    AND ".join(self._where))

        if self._group_by:
            sql_parts.append("GROUP BY " + ", ".join(self._group_by))

        if self._having:
            sql_parts.append("HAVING " + " AND ".join(self._having))

        if self._order_by:
            sql_parts.append("ORDER BY " + ", ".join(self._order_by))

        final_sql = "\n".join(sql_parts) + ";"
        return final_sql, tuple(self._params)


__all__ = ["FactQueryBuilder"]
