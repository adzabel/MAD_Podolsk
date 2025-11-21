from __future__ import annotations

from typing import Mapping

from .utils import normalize_string

# Общие константы категорий/смет

# Сметы, на основании которых считается план внерегламента
PLAN_BASE_CATEGORIES: set[str] = {"лето", "зима"}

# Коды смет, которые сводятся к единой категории «внерегламент»
VNR_CATEGORY_CODES: set[str] = {"внерегл_ч_1", "внерегл_ч_2"}

# Доля плана «внерегламента» от базового плана
VNR_PLAN_SHARE: float = 0.43

# Переименования/слияния некоторых категорий в единое отображаемое имя
MERGED_CATEGORY_OVERRIDES: Mapping[str, str] = {
    "внерегл_ч_1": "внерегламент",
    "внерегл_ч_2": "внерегламент",
}


def resolve_category_name(raw_key: str | None, title_hint: str | None = None) -> tuple[str, str]:
    """Возвращает пару (key, title) для группы сметы с учётом переименований.

    - key: внутренний ключ группировки
    - title: заголовок для отображения
    """
    candidate = normalize_string(raw_key)
    hint = normalize_string(title_hint)
    fallback = candidate or hint or "Прочее"
    override = MERGED_CATEGORY_OVERRIDES.get(fallback.lower())
    if override:
        return override, override
    key = candidate or fallback
    title = hint or fallback
    return key, title
