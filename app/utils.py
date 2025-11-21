from __future__ import annotations

from decimal import Decimal
from typing import Any


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float, Decimal)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_get_from_row(row: dict[str, Any], *keys: str, default: Any = None) -> Any:
    """Безопасно получить значение из словаря, пытаясь несколько ключей по порядку."""
    for key in keys:
        value = row.get(key)
        if value:
            return value
    return default
