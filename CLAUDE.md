# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo with a FastAPI backend (`be/`) and a React Router 7 frontend (`fe/`).

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

**Environment**: Copy `be/.env.ex` → `be/.env`. Required: `APP_NAME`, `PORT`, `DB_URL` (PostgreSQL connection string).

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

## Backend Architecture

Follows hexagonal (clean) architecture. The standard module layout:
```
modules/<name>/
  ports/input/       → use-case ABCs
  ports/output/      → repository ABCs (output ports)
  usecases/          → business logic; depends on output port only
  infrastructure/    → concrete repository (maps ORM ↔ entity)
  presenter/         → FastAPI router + DTOs
```

**Exception to the pattern**: `modules/face/` omits the ports layer — use cases depend directly on the shared `IUserRepository` output port from `modules/users/`.

**Shared layer** (`modules/shared/`): `UserEntity` is a pure Pydantic model (domain); `UserModel` is a SQLModel ORM model. `face_encoding` is `list[float]` in the entity but stored as `Optional[str]` (JSON-serialized) in the ORM model — the repository handles conversion.

**DI wiring**: Each layer exposes an `Annotated` type alias ending in `Dep`:
```python
IUserRepoDep = Annotated[IUserRepository, Depends(UserRepository)]  # output port → concrete
CreateUserUsecaseDep = Annotated[CreateUserUsecase, Depends(CreateUserUsecase)]
```
Routers inject these deps via function parameters.

**`@Transactional` decorator** (`libs/decorators/`): wraps async or sync use-case methods — auto-commits on success, rolls back on exception.

**Router registration**: All routers are assembled in `src/routers.py` as `all_router`, then mounted in `main.py` via the FastAPI `lifespan` context manager.

**Exception hierarchy** (`libs/exceptions/`): `NotFoundException` (404), `BadRequestException` (400), `UnauthorizedException` (401), `ForbiddenException` (403) — all subclass `BaseException` which maps to `HTTPException`.

## API Endpoints

```
GET  /health
GET  /users               list all users
POST /users               create user
GET  /users/{user_id}
POST /face/register       Form: name, image — extracts & stores face encoding
POST /face/verify         Form: user_id, image — compares against stored encoding (tolerance=0.6)
```

## Face Recognition Flow

- **Register**: `face_recognition.face_encodings()` extracts a `list[float]` from the uploaded image, stored via `UserEntity` into the DB.
- **Verify**: Loads the stored encoding, runs `face_recognition.compare_faces()` with `tolerance=0.6` against the new image's encoding, returns a `matched` boolean.
- Face capture in the frontend uses `navigator.mediaDevices.getUserMedia()` + canvas to snapshot a JPEG blob.

## Frontend Architecture

React Router 7 SSR. Routes declared in `app/routes.ts`. Data fetching uses loader/action functions server-side; client-side cache managed by TanStack Query (dehydrate/rehydrate pattern). The typed `apiFetch()` in `app/lib/api-fetch.ts` works in both server and client contexts. Module-local types go in `routes/<module>/types.ts`. i18n uses i18next with server-side locale detection (English and Spanish).
