from pydantic import BaseModel

class GetUserResponseDto(BaseModel):
    id: str
    email: str
    username: str
    is_active: bool

