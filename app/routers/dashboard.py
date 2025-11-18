from __future__ import annotations

from datetime import date
from typing import Annotated

import logging

from fastapi import APIRouter, Query, Request
from fastapi.responses import Response

from ..models import DashboardResponse
from ..pdf import build_dashboard_pdf
from ..queries import fetch_available_months, fetch_plan_vs_fact_for_month
from ..visit_logger import log_dashboard_visit

router = APIRouter()
logger = logging.getLogger(__name__)

MonthQuery = Annotated[
    date,
    Query(..., description="Первый день месяца, напр. 2025-11-01"),
]


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(month: MonthQuery, request: Request) -> DashboardResponse:
    """Основной эндпоинт для дашборда."""

    items, summary, last_updated = fetch_plan_vs_fact_for_month(month)
    try:
        log_dashboard_visit(request=request, endpoint="/dashboard")
    except Exception as exc:  # pragma: no cover - не должно влиять на выдачу
        logger.warning("Ошибка при логировании посещения: %s", exc, exc_info=True)

    return DashboardResponse(
        month=month,
        last_updated=last_updated,
        summary=summary,
        items=items,
        has_data=bool(items),
    )


@router.get("/dashboard/pdf")
def get_dashboard_pdf(month: MonthQuery, request: Request) -> Response:
    """Отдаёт тот же отчёт, но сразу в формате PDF."""

    items, summary, last_updated = fetch_plan_vs_fact_for_month(month)
    try:
        log_dashboard_visit(request=request, endpoint="/dashboard/pdf")
    except Exception as exc:  # pragma: no cover - не должно влиять на выдачу
        logger.warning("Ошибка при логировании посещения PDF: %s", exc, exc_info=True)

    pdf_bytes = build_dashboard_pdf(month, last_updated, items, summary)
    file_name = f"mad-podolsk-otchet-{month.strftime('%Y-%m')}.pdf"
    headers = {"Content-Disposition": f'attachment; filename="{file_name}"'}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.get("/dashboard/months")
def get_available_months(limit: Annotated[int | None, Query(gt=0, le=24)] = 12) -> dict[str, list[date]]:
    """Возвращает список месяцев, для которых есть данные."""

    months = fetch_available_months(limit=limit or 12)
    return {"months": months}
