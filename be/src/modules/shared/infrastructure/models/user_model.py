import uuid
from typing import Optional

from sqlmodel import Field, SQLModel


class UserModel(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    username: str
    email: str
    is_active: bool = True
    face_encoding: Optional[str] = Field(default=None)
    face_image: Optional[str] = Field(default=None)