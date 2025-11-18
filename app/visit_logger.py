from __future__ import annotations

import logging
from typing import Any, Iterable

from fastapi import Request
from psycopg2 import IntegrityError

from .db import get_connection

logger = logging.getLogger(__name__)

INSERT_VISIT_SQL = """
    INSERT INTO dashboard_visits (
        endpoint,
        client_ip,
        user_agent,
        user_id,
        session_id,
        session_duration_sec,
        device_type,
        browser,
        os
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
"""


def _get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip
    client = request.client
    if client:
        return client.host
    return None


def _get_user_id(request: Request) -> str | None:
    """Возвращает анонимный постоянный идентификатор пользователя.

    Ожидается, что фронтенд сохраняет его в localStorage/cookie и прокидывает в
    заголовке `X-User-Id` или cookie `user_id`.
    """

    user_id = request.headers.get("x-user-id") or request.cookies.get("user_id")
    if user_id:
        return user_id.strip() or None
    return None


def _get_session_id(request: Request) -> str | None:
    """Возвращает идентификатор сессии (UUID v4 без персональных данных)."""

    session_id = request.headers.get("x-session-id") or request.cookies.get(
        "session_id"
    )
    if session_id:
        return session_id.strip() or None
    return None


def _get_session_duration(request: Request) -> int | None:
    """Пытается извлечь длительность сессии в секундах из заголовка."""

    duration_raw = request.headers.get("x-session-duration-sec")
    if not duration_raw:
        return None
    try:
        duration = int(duration_raw)
    except (TypeError, ValueError):
        return None
    return duration if duration >= 0 else None


def _parse_user_agent(user_agent: str | None) -> tuple[str | None, str | None, str | None]:
    """Грубый парсер User-Agent для определения устройства, браузера и ОС."""

    if not user_agent:
        return None, None, None

    ua_lower = user_agent.lower()

    device_type: str | None
    if "mobi" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
        device_type = "mobile"
    else:
        device_type = "desktop"

    browser: str | None = None
    if "edg" in ua_lower:
        browser = "edge"
    elif "chrome" in ua_lower and "edg" not in ua_lower and "chromium" not in ua_lower:
        browser = "chrome"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "safari"
    elif "firefox" in ua_lower:
        browser = "firefox"
    elif "opr" in ua_lower or "opera" in ua_lower:
        browser = "opera"
    elif "trident" in ua_lower or "msie" in ua_lower:
        browser = "ie"

    os: str | None = None
    if "windows" in ua_lower:
        os = "windows"
    elif "android" in ua_lower:
        os = "android"
    elif "iphone" in ua_lower or "ipad" in ua_lower or "ios" in ua_lower:
        os = "ios"
    elif "mac os x" in ua_lower or "macintosh" in ua_lower:
        os = "macos"
    elif "linux" in ua_lower:
        os = "linux"

    return device_type, browser, os


def log_dashboard_visit(*, request: Request, endpoint: str) -> None:
    """Фиксирует посещение дашборда в базе данных.
    
    Асинхронные ошибки БД игнорируются чтобы не повлиять на основной запрос.
    """

    client_ip = _get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    user_id = _get_user_id(request)
    session_id = _get_session_id(request)
    session_duration = _get_session_duration(request)
    device_type, browser, os = _parse_user_agent(user_agent)

    values: Iterable[Any] = (
        endpoint,
        client_ip,
        user_agent,
        user_id,
        session_id,
        session_duration,
        device_type,
        browser,
        os,
    )

    try:
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(INSERT_VISIT_SQL, values)
            conn.commit()
    except IntegrityError as exc:
        # Может быть duplicate constraint если есть уникальный индекс на (session_id, endpoint)
        logger.debug(
            "Duplicate visit record для %s (session_id=%s): %s. Это нормально.",
            endpoint,
            session_id,
            exc,
        )
        # Откатываем транзакцию чтобы очистить состояние соединения
        try:
            conn.rollback()
        except Exception:
            pass
    except Exception as exc:  # pragma: no cover - запись не должна падать приложение
        logger.warning(
            "Не удалось записать посещение дашборда: %s", exc, exc_info=True
        )
