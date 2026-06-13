from pydantic import BaseModel


class ListUsersResponseDto(BaseModel):
    id: str
    name: str
