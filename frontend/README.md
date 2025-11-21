# MAD Podolsk Frontend (Vite)

## Локальная разработка
```bash
cd frontend
npm install
npm run dev
```
Dev сервер: http://localhost:5173
Переопределить API: добавить/изменить meta `mad-api-url` в `index.html` или в консоли выполнить:
```js
window.MAD_API_URL = 'https://mad-podolsk-karinausadba.amvera.io/api/dashboard'
```

## Сборка
```bash
npm run build
```
Результат: `frontend/dist` (хэшированные файлы: `index-<hash>.js/css`).

## Деплой (GitHub Actions)
Workflow `.github/workflows/deploy.yml`:
- checkout
- ssh ключ: секрет `SSH_PRIVATE_KEY_MAD`
- setup-node (v20) + `npm ci`
- `npm run build`
- rsync `frontend/dist/` → `u3330235@37.140.192.181:/var/www/u3330235/data/www/podolsk.mad.moclean.ru/`

## Настройки на сервере
1. Веб‑сервер (Nginx/Apache) `root /var/www/u3330235/data/www/podolsk.mad.moclean.ru;`
2. Включить gzip/brotli (если доступно) для `*.js, *.css`.
3. Кеширование:
	- Статические хэшированные файлы (`/assets/*`): `Cache-Control: public, max-age=31536000, immutable`
	- `index.html`: `Cache-Control: no-cache`
4. Право записи: пользователь деплоя должен иметь права на целевую директорию.
5. Чистка старых файлов делает `--delete` в rsync — дополнительных крон-задач не нужно.
6. Если нужен fallback (SPA) добавить правило `try_files $uri /index.html;` (не обязательно для текущего дашборда).

## Миграция
1. Убедиться что `npm run build` проходит без ошибок (предупреждения по CSS можно устранить позже).
2. Протестировать деплой: пуш в `main` → проверить обновление сайта.
3. После подтверждения удалить `docs/` и `scripts/cache_bust.py` (не используются — Vite сам хэширует).
4. Обновить любые сторонние ссылки на старый путь (если были прямые ссылки на `docs/`).

## Быстрый чек после деплоя
- Открыть сайт, проверить загрузку `index-*.js` и `index-*.css` (200 статус).
- Проверить отсутствие 404 в DevTools → Network.
- Проверить meta `mad-api-url` и сетевые запросы к API.

## Полезные команды
```bash
# Анализ сборки (список файлов)
ls -1 dist/assets

# Предпросмотр прод. сборки
npm run preview
```

## Дальнейшие улучшения
- Вынести стили по компонентам (PostCSS, CSS Modules или UnoCSS).
- Добавить линтер (ESLint) + форматирование (Prettier).
- Настроить автокеширование CDN (Cloudflare) поверх статического хостинга.


