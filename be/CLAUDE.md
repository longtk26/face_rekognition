# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
make run                        # Start FastAPI dev server (fastapi dev src/main.py)
make newmg name="<description>" # Auto-generate Alembic migration from model changes
make mghead                     # Apply all pending migrations
make mgdown                     # Rollback last migration
```

No test infrastructure is set up yet.

## Architecture

Module-based hexagonal (clean) architecture. Each module owns its own layers; shared domain and infrastructure live in `modules/shared/`.

```
src/
├── main.py              # App entry point; lifespan registers routers
├── routers.py           # Central router registry — add new module routers here
├── configs/
│   └── config.py        # Pydantic Settings singleton (reads .env)
│
├── modules/
│   ├── __init__.py      # Import all ORM models here for Alembic autogenerate
│   ├── shared/
│   │   ├── domain/
│   │   │   ├── entities/          # Pure Pydantic domain entities (no ORM)
│   │   │   │   └── user_entity.py
│   │   │   └── value-objects/
│   │   └── infrastructure/
│   │       └── models/            # SQLModel ORM classes (shared across modules)
│   │           └── user_model.py
│   │
│   ├── health/
│   │   ├── ports/input/           # Input port ABCs (use-case interfaces)
│   │   ├── usecases/
│   │   │   └── health_check_usecase.py  # Use-case class + Dep type alias
│   │   └── presenter/
│   │       ├── router.py          # FastAPI router; injects use-case deps
│   │       └── dtos/              # Request/response Pydantic models
│   │
│   └── users/
│       ├── ports/
│       │   ├── input/             # Input port ABCs
│       │   └── output/            # Output port ABCs (IUserRepository)
│       │       └── user_repository.py
│       ├── usecases/
│       │   ├── create_user_usecase.py   # Use-case class + Dep type alias
│       │   └── get_user_usecase.py
│       ├── infrastructure/
│       │   ├── persistence/
│       │   │   └── user_repository.py  # UserRepository + IUserRepoDep binding
│       │   └── adapters/
│       └── presenter/
│           ├── router.py
│           └── dtos/
│
└── libs/
    ├── database/session.py              # DBSessionManager, SessionDep
    ├── repository/base_repository.py    # Optional BaseRepository utility
    ├── exceptions/base_exception.py     # NotFoundException, BadRequestException, etc.
    └── decorators/transactional_decorator.py  # @Transactional decorator
```

## Key Concepts

- **Entity** (`shared/domain/entities/`): Pure Pydantic `BaseModel` — no ORM annotations. Shared across modules.
- **Input port** (`ports/input/`): ABC defining the use-case interface.
- **Output port** (`ports/output/`): ABC defining the repository interface that the use case depends on.
- **Use case** (`usecases/<action>_usecase.py`): Implements business logic. Depends on the output port interface only. Defines its own `<Name>Dep` type alias.
- **Model** (`shared/infrastructure/models/`): SQLModel ORM class. Only the repository touches this.
- **Repository** (`infrastructure/persistence/`): Implements the output port. Maps between ORM model and domain entity. Defines the `I<Name>RepoDep` binding (interface → concrete).
- **Presenter** (`presenter/`): FastAPI router + DTOs. Injects use-case deps and handles HTTP.

## Dependency Injection Pattern

Each layer defines its own `Dep` type alias; downstream layers import and use it:

```python
# infrastructure/persistence/user_repository.py
IUserRepoDep = Annotated[IUserRepository, Depends(UserRepository)]

# usecases/create_user_usecase.py
from src.modules.users.ports.output import IUserRepoDep

class CreateUserUsecase:
    def __init__(self, user_repo: IUserRepoDep): ...

CreateUserUsecaseDep = Annotated[CreateUserUsecase, Depends(CreateUserUsecase)]

# presenter/router.py
from src.modules.users.usecases import CreateUserUsecaseDep

@user_router.post("")
async def create_user(user: CreateUserRequestDto, usecase: CreateUserUsecaseDep): ...
```

For use cases with no repository (e.g. health), `Depends` directly on the concrete class:

```python
HealthCheckUsecaseDep = Annotated[HealthCheckUsecase, Depends(HealthCheckUsecase)]
```

## Adding a New Module

1. Add shared domain types (if cross-module):
   - `src/modules/shared/domain/entities/<name>_entity.py` — pure Pydantic `BaseModel`
   - `src/modules/shared/infrastructure/models/<name>_model.py` — SQLModel ORM class
2. Create `src/modules/<name>/` with:
   - `ports/input/` — input port ABCs *(optional)*
   - `ports/output/<name>_repository.py` — `I<Name>Repository` ABC *(skip if no DB)*
   - `infrastructure/persistence/<name>_repository.py` — concrete repo + `I<Name>RepoDep` *(skip if no DB)*
   - `usecases/<action>_usecase.py` — use-case class + `<Action>UsecaseDep`
   - `presenter/router.py` — FastAPI router
   - `presenter/dtos/<name>_dto.py` — request/response DTOs
3. Import the ORM model in `src/modules/__init__.py` (required for Alembic autogenerate)
4. Run `make newmg name="<description>"`, review, then `make mghead`
5. Register the router in `src/routers.py`

## Key Conventions

- **`@Transactional`**: Apply to use-case methods that write to the database; auto-commits on success, rolls back on exception.
- **Exceptions**: Use custom exceptions from `src/libs/exceptions/base_exception.py` rather than raw `HTTPException`.
- **ORM ↔ Entity mapping**: Repositories map between `<Name>Model` (ORM) and the domain entity. Use cases never import ORM classes.
- **Environment**: Copy `.env.ex` to `.env`. Required vars: `APP_NAME`, `PORT`, `DB_URL` (PostgreSQL connection string).

## Stack

- **FastAPI 0.124** with `fastapi[standard]` (includes Uvicorn)
- **SQLModel 0.0.27** — ORM models live in `modules/shared/infrastructure/models/` only
- **Alembic 1.17** for migrations
- **PostgreSQL** via psycopg2-binary
- **pydantic-settings** for config
