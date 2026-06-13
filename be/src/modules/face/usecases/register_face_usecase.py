import uuid
from io import BytesIO
from typing import Annotated

import face_recognition
from fastapi import Depends

from src.libs.decorators.transactional_decorator import Transactional
from src.libs.exceptions.base_exception import BadRequestException
from src.modules.face.presenter.dtos import RegisterFaceResponseDto
from src.modules.shared.domain.entities import UserEntity
from src.modules.users.ports.output import IUserRepoDep


class RegisterFaceUsecase:
    def __init__(self, user_repo: IUserRepoDep):
        self.user_repo = user_repo

    @Transactional
    async def execute(self, name: str, image_bytes: bytes) -> RegisterFaceResponseDto:
        image = face_recognition.load_image_file(BytesIO(image_bytes))
        encodings = face_recognition.face_encodings(image)
        if not encodings:
            raise BadRequestException("No face detected in the image. Please try again with a clearer photo.")

        encoding = encodings[0].tolist()
        short_id = str(uuid.uuid4())[:8]
        user_entity = UserEntity(
            username=name,
            email=f"{name.lower().replace(' ', '_')}_{short_id}@face.local",
            face_encoding=encoding,
        )
        created = self.user_repo.create(user_entity)
        return RegisterFaceResponseDto(id=str(created.id), name=created.username)


RegisterFaceUsecaseDep = Annotated[RegisterFaceUsecase, Depends(RegisterFaceUsecase)]
