
from src.modules.users.ports.output import IUserRepoDep
from src.modules.shared.domain.entities import UserEntity
from src.modules.users.presenter.dtos import (
    CreateUserRequestDto,
    CreateUserResponseDto
)
from src.libs.decorators.transactional_decorator import Transactional
from typing import Annotated
from fastapi import Depends


class CreateUserUsecase():
    def __init__(self, user_repo: IUserRepoDep):
        self.user_repo = user_repo
    
    @Transactional
    async def execute(self, user_dto: CreateUserRequestDto) -> CreateUserResponseDto:
        user_entity = self.user_repo.create(user_dto.to_entity())
        return self.__to_response(user_entity)

    def __to_response(self, user_entity: UserEntity) -> CreateUserResponseDto:
        return CreateUserResponseDto(id=str(user_entity.id))

CreateUserUsecaseDep = Annotated[CreateUserUsecase, Depends(CreateUserUsecase)]