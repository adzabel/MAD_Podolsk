from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class DashboardItem(BaseModel):
    """Запись дашборда с минимальным набором полей."""

    smeta: str | None = None
    work_name: str | None = None
    planned_amount: float | None = None
    fact_amount: float | None = None


class DailyRevenue(BaseModel):
    date: date
    amount: float


class DailyWorkVolume(BaseModel):
    date: date
    amount: float
    unit: str = ""
    total_amount: float = 0.0


class DailyReportItem(BaseModel):
    smeta: str | None = None
    work_type: str | None = None
    description: str
    unit: str | None = None
    total_volume: float | None = None
    total_amount: float | None = None


class DailyReportResponse(BaseModel):
    date: date
    last_updated: datetime | None = None
    items: list[DailyReportItem]
    has_data: bool


class DashboardSummary(BaseModel):
    planned_amount: float
    fact_amount: float
    completion_pct: float | None = None
    delta_amount: float
    contract_amount: float | None = None
    contract_executed: float | None = None
    contract_completion_pct: float | None = None
    average_daily_revenue: float | None = None
    daily_revenue: list[DailyRevenue] | None = None


class DashboardResponse(BaseModel):
    month: date
    last_updated: datetime | None
    summary: DashboardSummary | None
    items: list[DashboardItem]
    has_data: bool
