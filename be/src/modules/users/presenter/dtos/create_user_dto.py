from pydantic import BaseModel
from src.modules.shared.domain.entities import UserEntity


class CreateUserRequestDto(BaseModel):
    username: str
    email: str
    is_active: bool = True

    def to_entity(self) -> UserEntity:
        return UserEntity(username=self.username, email=self.email, is_active=self.is_active)

class CreateUserResponseDto(BaseModel):
    id: str
  
