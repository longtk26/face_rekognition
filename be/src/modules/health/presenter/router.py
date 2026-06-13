from fastapi import APIRouter
from src.modules.health.usecases import HealthCheckUsecaseDep
from src.modules.health.presenter.dtos import HealthCheckResponseDto


health_router = APIRouter(tags=["health"])


@health_router.get("/health", response_model=HealthCheckResponseDto)
async def health_check(usecase: HealthCheckUsecaseDep):
    return await usecase.execute()
