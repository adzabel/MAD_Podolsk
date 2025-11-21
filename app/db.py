from __future__ import annotations

from contextlib import AbstractContextManager, contextmanager
import logging
from threading import Lock
from typing import Iterator, Protocol, Callable, TypeVar

from psycopg2 import OperationalError, connect
from psycopg2.extensions import connection as PGConnection
from psycopg2.pool import ThreadedConnectionPool

from .config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T")


class _ConnectionProvider(Protocol):
    def connection(self) -> AbstractContextManager[PGConnection]:
        """Возвращает контекстный менеджер с подключением."""

    def close(self) -> None:
        """Закрывает ресурсы провайдера."""


class _ThreadSafeConnectionPool:
    """Обёртка над ThreadedConnectionPool с безопасным контекстом."""

    def __init__(self, conninfo: str, *, min_size: int = 1, max_size: int = 10) -> None:
        self._pool = ThreadedConnectionPool(minconn=min_size, maxconn=max_size, dsn=conninfo)

    def _get_valid_connection(self) -> PGConnection:
        conn = self._pool.getconn()
        try:
            self._ensure_connection_alive(conn)
        except Exception as exc:
            logger.error(
                "Ошибка при проверке соединения с БД, закрываю и возвращаю в пул: %s",
                exc,
                exc_info=True,
            )
            self._pool.putconn(conn, close=True)

            logger.info("Пробую получить новое соединение после ошибки проверки.")
            conn = self._pool.getconn()
            try:
                self._ensure_connection_alive(conn)
            except Exception:
                self._pool.putconn(conn, close=True)
                raise
        return conn

    @staticmethod
    def _ensure_connection_alive(conn: PGConnection) -> None:
        if conn.closed:
            msg = "Соединение с базой данных закрыто"
            raise OperationalError(msg)

        if not conn.autocommit:
            conn.rollback()

        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        except OperationalError as exc:
            error_msg = str(exc).lower()
            if "ssl" in error_msg or "certificate" in error_msg or "tls" in error_msg:
                logger.error(
                    "SSL/TLS ошибка соединения с БД. DB_DSN уже содержит sslmode=disable. "
                    "Проверьте состояние сетевого соединения и доступность БД, а также правильность хоста и портов. Ошибка: %s",
                    exc,
                )
            else:
                logger.error(
                    "Ошибка проверки соединения с БД: %s",
                    exc,
                )
            raise

    @contextmanager
    def connection(self) -> Iterator[PGConnection]:
        conn = self._get_valid_connection()
        try:
            yield conn
        except Exception as exc:
            logger.warning(
                "Ошибка при использовании соединения из пула, закрываю соединение: %s",
                exc,
                exc_info=False,
            )
            self._pool.putconn(conn, close=True)
            raise
        else:
            self._pool.putconn(conn)

    def close(self) -> None:
        self._pool.closeall()


class _DirectConnectionProvider:
    """Запасной вариант без пула (последовательные подключения)."""

    def __init__(self, conninfo: str) -> None:
        self._conninfo = conninfo

    @contextmanager
    def connection(self) -> Iterator[PGConnection]:
        conn = connect(self._conninfo)
        try:
            yield conn
        finally:
            conn.close()

    def close(self) -> None:  # pragma: no cover - нечего закрывать
        return None


_pool: _ConnectionProvider | None = None
_pool_lock = Lock()


def _create_pool(dsn: str) -> _ConnectionProvider:
    try:
        return _ThreadSafeConnectionPool(conninfo=dsn)
    except Exception as exc:  # pragma: no cover - защита от неожиданных ошибок
        logger.error(
            "Не удалось создать ThreadedConnectionPool: %s. Переключаюсь на последовательные подключения.",
            exc,
            exc_info=True,
        )
        return _DirectConnectionProvider(conninfo=dsn)


def _get_pool() -> _ConnectionProvider:
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                dsn = get_settings().db_dsn
                if not dsn:
                    msg = (
                        "Переменная окружения DB_DSN не задана. "
                        "Невозможно установить соединение с базой данных."
                    )
                    raise RuntimeError(msg)

                logger.info(
                    "Инициализация пула соединений с БД (с параметром sslmode)"
                )
                _pool = _create_pool(dsn)
    return _pool


@contextmanager
def get_connection() -> Iterator[PGConnection]:
    """Получение соединения из пула с автоматическим возвратом."""

    pool = _get_pool()
    with pool.connection() as conn:
        yield conn


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def safe_rollback(conn: PGConnection | None) -> None:
    """Безопасно откатывает транзакцию, если соединение доступно.

    Защищает вызывающий код от ошибок, если соединение было не создано
    или уже закрыто.
    """
    try:
        if conn is None:
            return
        # psycopg2 connection has `closed` attribute (0 = open, non-zero = closed)
        closed = getattr(conn, "closed", None)
        if closed is None:
            return
        if closed:
            return
        conn.rollback()
    except Exception:
        logger.debug("safe_rollback: rollback failed", exc_info=True)


def fetchall_safe(
    conn: PGConnection | None,
    sql: str,
    params: tuple | None = None,
    *,
    cursor_factory=None,
    label: str | None = None,
) -> list:
    """Выполняет запрос и возвращает список строк; при ошибке логирует и возвращает пустой список.

    Используется для упрощения повторяющихся блоков чтения из БД в коде приложения.
    """
    if conn is None:
        return []
    try:
        with conn.cursor(cursor_factory=cursor_factory) as cur:
            cur.execute(sql, params or ())
            return cur.fetchall() or []
    except Exception as exc:  # pragma: no cover - защитный код
        lbl = f" ({label})" if label else ""
        logger.warning(
            "Ошибка выполнения запроса%s: %s",
            lbl,
            exc,
            exc_info=True,
        )
        safe_rollback(conn)
        return []


def fetchone_safe(
    conn: PGConnection | None,
    sql: str,
    params: tuple | None = None,
    *,
    cursor_factory=None,
    label: str | None = None,
) -> object | None:
    """Выполняет запрос и возвращает одну строку; при ошибке логирует и возвращает None."""
    if conn is None:
        return None


def execute_with_cursor(
    conn: PGConnection | None,
    sql: str,
    params: tuple | None = None,
    *,
    cursor_factory=None,
    label: str | None = None,
    processor: Callable[[object], T] | None = None,
) -> T:
    """Выполнить запрос и передать курсор в `processor` для потоковой обработки.

    При ошибке выполняется безопасный откат и исключение повторно пробрасывается.
    """
    if conn is None:
        if processor is None:
            return None  # type: ignore[return-value]
        # если нет соединения, вызываем processor с None нецелесообразно
        raise RuntimeError("No DB connection provided to execute_with_cursor")
    try:
        with conn.cursor(cursor_factory=cursor_factory) as cur:
            cur.execute(sql, params or ())
            if processor is None:
                # Если нет обработчика, вернём пустой список по соглашению fetchall_safe
                return cur.fetchall()  # type: ignore[return-value]
            return processor(cur)
    except Exception as exc:  # pragma: no cover - защитный код
        lbl = f" ({label})" if label else ""
        logger.warning(
            "Ошибка выполнения курсорного запроса%s: %s",
            lbl,
            exc,
            exc_info=True,
        )
        safe_rollback(conn)
        raise


def execute_and_commit(
    conn: PGConnection | None,
    sql: str,
    params: tuple | None = None,
    *,
    cursor_factory=None,
    label: str | None = None,
) -> bool:
    """Выполнить DML/DDL запрос и закоммитить транзакцию; при ошибке откат и False."""
    if conn is None:
        return False
    try:
        with conn.cursor(cursor_factory=cursor_factory) as cur:
            cur.execute(sql, params or ())
        conn.commit()
        return True
    except Exception as exc:  # pragma: no cover - защитный код
        lbl = f" ({label})" if label else ""
        logger.warning(
            "Ошибка при выполнении и коммите запроса%s: %s",
            lbl,
            exc,
            exc_info=True,
        )
        safe_rollback(conn)
        return False
    try:
        with conn.cursor(cursor_factory=cursor_factory) as cur:
            cur.execute(sql, params or ())
            return cur.fetchone()
    except Exception as exc:  # pragma: no cover - защитный код
        lbl = f" ({label})" if label else ""
        logger.warning(
            "Ошибка выполнения запроса%s: %s",
            lbl,
            exc,
            exc_info=True,
        )
        safe_rollback(conn)
        return None
