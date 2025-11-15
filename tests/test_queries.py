from decimal import Decimal

from app.queries import _to_float


def test_to_float_converts_regular_numbers():
    assert _to_float(10) == 10.0
    assert _to_float("3.14") == 3.14


def test_to_float_filters_nan_and_inf():
    assert _to_float(float("nan")) is None
    assert _to_float(float("inf")) is None
    assert _to_float(Decimal("NaN")) is None
    assert _to_float(Decimal("Infinity")) is None


def test_to_float_handles_invalid_values():
    assert _to_float(None) is None
    assert _to_float("not-a-number") is None
