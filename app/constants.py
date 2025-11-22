from __future__ import annotations

"""Общие константы для бэкенда MAD Podolsk.

Собраны значения, которые используются в нескольких модулях и не завязаны
жёстко на реализацию конкретного файла.
"""

# HTTP / API
API_PREFIX = "/api"
DASHBOARD_BASE_PATH = f"{API_PREFIX}/dashboard"
HEALTH_PATH = "/health"

# Отображение значений
EMPTY_DISPLAY_VALUE = "–"
THOUSANDS_SEPARATOR = " "
PERCENT_SUFFIX = " %"

# Таймзона проекта
TZ_MOSCOW_NAME = "Europe/Moscow"

# Категории и коды
CATEGORY_SUMMER = "лето"
CATEGORY_WINTER = "зима"
CATEGORY_VNR_1 = "внерегл_ч_1"
CATEGORY_VNR_2 = "внерегл_ч_2"

CATEGORY_SEASONAL = {CATEGORY_SUMMER, CATEGORY_WINTER}
CATEGORY_VNR_CODES = {CATEGORY_VNR_1, CATEGORY_VNR_2}

CATEGORY_VNR_LABEL = "внерегламент"

# Имена таблиц БД
TABLE_PLAN_VS_FACT_MONTHLY = "skpdi_plan_vs_fact_monthly"
TABLE_RATES = "skpdi_rates"
TABLE_FACT_AGG = "skpdi_fact_agg"
TABLE_PLAN_AGG = "skpdi_plan_agg"
TABLE_CONTRACT_TOTAL = "podolsk_mad_2025_contract_amount"
TABLE_CONTRACT_EXECUTED = "skpdi_fact_monthly_cat_mv"

# PDF / отчёты
LAST_UPDATED_DATETIME_FORMAT = "%d.%m.%Y %H:%M МСК"
MIN_VALUE_THRESHOLD = 1.0
PAGE_NUMBER_OFFSET_X_MM = 15
PAGE_NUMBER_OFFSET_Y_MM = 10

SUMMARY_LABEL_PLAN = "План"
SUMMARY_LABEL_FACT = "Факт"
SUMMARY_LABEL_COMPLETION = "Выполнение"
SUMMARY_LABEL_DELTA = "Отклонение"

TABLE_HEADER_SMETA = "Смета"
TABLE_HEADER_PLAN = "План"
TABLE_HEADER_FACT = "Факт"
TABLE_HEADER_DELTA = "Отклонение"

UNTITLED_WORK_LABEL = "Без названия"
