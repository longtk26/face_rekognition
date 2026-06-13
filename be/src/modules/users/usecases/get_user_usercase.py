
from src.modules.users.ports.output import IUserRepoDep
from src.modules.shared.domain.entities import UserEntity
from src.libs.decorators.transactional_decorator import Transactional
from typing import Annotated
from fastapi import Depends, status

class GetUserUsecase():
    def __init__(self, user_repo: IUserRepoDep):
        self.user_repo = user_repo
    
    async def execute(self, user_id: str) -> UserEntity:
        user = self.user_repo.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user



GetUserUsecaseDep = Annotated[GetUserUsecase, Depends(GetUserUsecase)]