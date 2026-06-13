from src.modules.users.ports.output import IUserRepoDep
from src.modules.users.presenter.dtos import ListUsersResponseDto
from typing import Annotated
from fastapi import Depends


class ListUsersUsecase:
    def __init__(self, user_repo: IUserRepoDep):
        self.user_repo = user_repo

    async def execute(self) -> list[ListUsersResponseDto]:
        users = self.user_repo.find_all()
        return [ListUsersResponseDto(id=str(u.id), name=u.username) for u in users]


ListUsersUsecaseDep = Annotated[ListUsersUsecase, Depends(ListUsersUsecase)]
