import json
from fastapi import Depends
from typing import Annotated
from sqlmodel import select
from src.modules.users.ports.output import IUserRepository
from src.modules.shared.domain.entities import UserEntity
from src.modules.shared.infrastructure.models import UserModel
from src.libs.database.session import SessionDep


class UserRepository(IUserRepository):
    def __init__(self, session: SessionDep):
        self.session = session

    def create(self, user: UserEntity) -> UserEntity:
        model = self.__to_model(user)
        self.session.add(model)
        self.session.flush()
        return self.__to_entity(model)

    def find_by_id(self, user_id: str) -> UserEntity | None:
        model = self.session.get(UserModel, user_id)
        if model is None:
            return None
        return self.__to_entity(model)

    def find_all(self) -> list[UserEntity]:
        models = self.session.exec(select(UserModel)).all()
        return [self.__to_entity(m) for m in models]

    def __to_entity(self, model: UserModel) -> UserEntity:
        face_encoding = json.loads(model.face_encoding) if model.face_encoding else None
        return UserEntity(
            id=model.id,
            username=model.username,
            email=model.email,
            is_active=model.is_active,
            face_encoding=face_encoding,
            face_image=model.face_image,
        )

    def __to_model(self, entity: UserEntity) -> UserModel:
        face_encoding = json.dumps(entity.face_encoding) if entity.face_encoding else None
        return UserModel(
            id=entity.id,
            username=entity.username,
            email=entity.email,
            is_active=entity.is_active,
            face_encoding=face_encoding,
            face_image=entity.face_image,
        )

IUserRepoDep = Annotated[IUserRepository, Depends(UserRepository)]
