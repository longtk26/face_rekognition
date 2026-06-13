import uuid

from pydantic import BaseModel


class UserEntity(BaseModel):
    id: uuid.UUID | None = None
    username: str
    email: str
    is_active: bool = True
    face_encoding: list[float] | None = None
    face_image: str | None = None
