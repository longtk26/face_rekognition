# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo with a FastAPI backend (`be/`) and a React Router 7 frontend (`fe/`). Each subdirectory has its own `CLAUDE.md` with detailed layer-by-layer guidance — read that file first when working in a specific side.

```
face-recognization/
├── be/          # Python/FastAPI — hexagonal architecture, PostgreSQL, Alembic
└── fe/          # React Router 7 (SSR), TypeScript, TanStack Query, Shadcn UI
```

## Backend (`be/`)

**Start dev server** (from `be/`):
```bash
make run                          # fastapi dev src/main.py
```

**Database migrations** (from `be/`):
```bash
make newmg name="<description>"   # autogenerate migration from model changes
make mghead                       # apply all pending migrations
make mgdown                       # rollback last migration
```

**Environment**: Copy `be/.env.ex` → `be/.env`. Required: `APP_NAME`, `PORT`, `DB_URL` (PostgreSQL).

No test suite yet.

## Frontend (`fe/`)

**Start dev server** (from `fe/`):
```bash
bun run dev
```

**Other scripts** (from `fe/`):
```bash
bun run typecheck   # TypeScript + React Router type generation
bun run lint        # ESLint
bun run build       # Production build
bun run start       # Serve production build
```

## Architecture at a Glance

**Backend** follows hexagonal (clean) architecture. A feature module looks like:
```
modules/<name>/
  ports/input/       → use-case ABCs
  ports/output/      → repository ABCs (output ports)
  usecases/          → business logic; depends on output port only
  infrastructure/    → concrete repository (maps ORM ↔ entity)
  presenter/         → FastAPI router + DTOs
```
Shared domain entities and ORM models live in `modules/shared/`. The `@Transactional` decorator (from `libs/decorators/`) auto-commits on success and rolls back on exception. DI is wired via FastAPI `Depends()` + `Annotated` type aliases named `*Dep`.

**Frontend** uses React Router 7 SSR. Routes are declared in `app/routes.ts`. Data fetching uses loader/action functions server-side; client-side cache is managed by TanStack Query (dehydrate/rehydrate pattern). The typed `apiFetch()` in `app/lib/api-fetch.ts` works in both contexts. Module-local types go in `routes/<module>/types.ts`. i18n uses i18next with server-side locale detection (English and Spanish).
