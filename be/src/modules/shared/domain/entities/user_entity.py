from pydantic import BaseModel
import uuid


class UserEntity(BaseModel):
    id: uuid.UUID | None = None
    username: str
    email: str
    is_active: bool = True
    face_encoding: list[float] | None = None
