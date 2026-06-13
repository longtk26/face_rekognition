import base64
import uuid
from typing import Annotated

from fastapi import Depends

from src.libs.decorators.transactional_decorator import Transactional
from src.modules.face.presenter.dtos import RegisterFaceResponseDto
from src.modules.shared.domain.entities import UserEntity
from src.modules.users.ports.output import IUserRepoDep


class RegisterFaceUsecase:
    def __init__(self, user_repo: IUserRepoDep):
        self.user_repo = user_repo

    @Transactional
    async def execute(self, name: str, image_bytes: bytes) -> RegisterFaceResponseDto:
        short_id = str(uuid.uuid4())[:8]
        user_entity = UserEntity(
            username=name,
            email=f"{name.lower().replace(' ', '_')}_{short_id}@face.local",
            face_image=base64.b64encode(image_bytes).decode("utf-8"),
        )
        created = self.user_repo.create(user_entity)
        return RegisterFaceResponseDto(id=str(created.id), name=created.username)


RegisterFaceUsecaseDep = Annotated[RegisterFaceUsecase, Depends(RegisterFaceUsecase)]
