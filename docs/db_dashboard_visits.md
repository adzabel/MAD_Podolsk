# Таблица для логирования посещений дашборда

Для фиксации обращений к API `/api/dashboard` и `/api/dashboard/pdf` в базе PostgreSQL (Neon) создайте служебную таблицу с привязкой к анонимному пользователю и сессии:

```sql
CREATE TABLE IF NOT EXISTS dashboard_visits (
    id            BIGSERIAL PRIMARY KEY,
    visited_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    endpoint      TEXT NOT NULL,
    client_ip     TEXT,
    user_agent    TEXT,
    user_id       TEXT,
    session_id    TEXT,
    session_duration_sec INTEGER,
    device_type   TEXT,
    browser       TEXT,
    os            TEXT
);

CREATE INDEX IF NOT EXISTS idx_dashboard_visits_visited_at
    ON dashboard_visits (visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_visits_user_id
    ON dashboard_visits (user_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_visits_session_id
    ON dashboard_visits (session_id);
```

* `visited_at` — время фиксации запроса (по умолчанию `now()`).
* `endpoint` — путь эндпоинта (например, `/dashboard` или `/dashboard/pdf`).
* `client_ip` — IP клиента, берётся из `X-Forwarded-For` либо из `request.client`.
* `user_agent` — строка User-Agent запроса.
* `user_id` — анонимный устойчивый идентификатор пользователя (UUID/хеш), прокидывается фронтендом.
* `session_id` — UUID для текущей сессии.
* `session_duration_sec` — длительность завершённой сессии в секундах (если фронтенд её передал в запросе).
* `device_type` — mobile/desktop, определяется по User-Agent.
* `browser` — имя браузера, грубый парсинг User-Agent.
* `os` — ОС клиента по User-Agent.

В таблице нет ограничений на уникальность, чтобы фиксировать все обращения подряд.

### Миграция существующей таблицы

Если таблица уже была создана без новых столбцов, добавьте их через ALTER TABLE:

```sql
ALTER TABLE dashboard_visits
    ADD COLUMN IF NOT EXISTS user_id TEXT,
    ADD COLUMN IF NOT EXISTS session_id TEXT,
    ADD COLUMN IF NOT EXISTS session_duration_sec INTEGER,
    ADD COLUMN IF NOT EXISTS device_type TEXT,
    ADD COLUMN IF NOT EXISTS browser TEXT,
    ADD COLUMN IF NOT EXISTS os TEXT;

CREATE INDEX IF NOT EXISTS idx_dashboard_visits_user_id ON dashboard_visits (user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_visits_session_id ON dashboard_visits (session_id);
```

Если в таблице остался прежний столбец `month` и он больше не нужен, его можно удалить:

```sql
ALTER TABLE dashboard_visits DROP COLUMN IF EXISTS month;
DROP INDEX IF EXISTS idx_dashboard_visits_month;
```

### Как формировать идентификаторы на фронтенде

* **user_id (персистентный):** генерируется при первом заходе (UUID v4 или `sha256(device + install_timestamp)`), сохраняется в `localStorage`/cookie и отправляется в заголовке `X-User-Id` или cookie `user_id` при каждом запросе.
* **session_id:** генерируется на старте новой сессии (UUID v4), отправляется в заголовке `X-Session-Id` или cookie `session_id`.
* **session_duration_sec:** по завершении сессии фронтенд может передать длительность в секундах в заголовке `X-Session-Duration-Sec`.

Все эти данные пишутся в таблицу вместе с техническими метаданными (IP, User-Agent, определённые тип устройства/браузер/ОС).
