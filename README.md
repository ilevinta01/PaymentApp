# Оплата — B2B SaaS PWA учёта платежей

Мультитенантная платформа учёта оплат для детских центров, спортивных секций и языковых
школ: аутентификация и роли, фиксация оплат (наличные/карта), автоматический список
должников, реестр изменений платежей, Telegram-чеки родителям и панель владельца платформы
для управления подписками детских центров.

## Стек

- Backend: NestJS + TypeScript + Prisma + PostgreSQL
- Frontend: React + TypeScript + Vite + vite-plugin-pwa + Tailwind CSS
- Монорепозиторий: pnpm workspaces (`apps/backend`, `apps/frontend`, `packages/shared`)

## Быстрый старт (разработка)

1. Поднять PostgreSQL (см. `docker-compose.yml`, требуется Docker):
   ```
   docker compose up -d
   ```
   Если Docker не установлен — используйте локальный PostgreSQL или облачную БД,
   указав её адрес в `apps/backend/.env` (`DATABASE_URL`).

2. Установить зависимости из корня репозитория:
   ```
   pnpm install
   ```

3. Настроить backend:
   ```
   cd apps/backend
   copy .env.example .env
   pnpm prisma:generate
   pnpm prisma:migrate
   pnpm prisma:seed
   ```
   Не забудьте задать `PLATFORM_ADMIN_KEY` в `.env` — это ключ доступа к панели владельца
   платформы (`/platform`), отдельный от логина детских центров.

   Seed создаёт тестовый детский центр и двух пользователей:
   - Супер-Админ: `admin@demo.local` / `admin123`
   - Преподаватель: `teacher@demo.local` / `teacher123`

4. Запустить backend и frontend (из корня, в двух терминалах):
   ```
   pnpm dev:backend
   pnpm dev:frontend
   ```
   Backend: http://localhost:3001, Frontend: http://localhost:5173, панель платформы:
   http://localhost:5173/platform (введите `PLATFORM_ADMIN_KEY` из `.env`).

## Структура

```
apps/
  backend/   NestJS API (auth, tenant-settings, users, groups, students, payments,
             payment-logs, debtors, platform)
  frontend/  React PWA (логин, дашборд владельца, кабинет преподавателя, панель платформы)
packages/
  shared/    Общие enum/типы (роли, способы оплаты, статусы, DTO)
```

## Деплой

В `apps/backend/Dockerfile` и `apps/frontend/Dockerfile` — multi-stage сборки для продакшена
(frontend раздаётся через nginx с SPA fallback). Пример запуска через свой Postgres:

```
docker build -t oplata-backend -f apps/backend/Dockerfile .
docker build -t oplata-frontend -f apps/frontend/Dockerfile --build-arg VITE_API_URL=https://api.example.com .
```

Перед реальным деплоем: задайте боевые `JWT_SECRET` и `PLATFORM_ADMIN_KEY` (длинные случайные
строки), настройте HTTPS/домен и вынесите `DATABASE_URL` на управляемый Postgres. Выбор
хостинга (VPS, Railway, Render и т.п.) и настройка домена/TLS — решение, которое нужно
принять отдельно и не сделано за вас.

## Дорожная карта

- Спринт 1 (готово): фундамент, аутентификация, мультитенантность, CRUD владельца.
- Спринт 2 (готово): фиксация оплаты по ролям, модуль «Должники» (живой расчёт + cron 11 число).
- Спринт 3 (готово): редактирование платежей с реестром изменений, Telegram-чеки.
- Спринт 4 (готово): панель владельца платформы (подписки тенантов), офлайн-режим PWA,
  Dockerfile для деплоя.
