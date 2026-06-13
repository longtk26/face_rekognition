from io import BytesIO
from typing import Annotated

import face_recognition
import numpy as np
from fastapi import Depends

from src.libs.exceptions.base_exception import BadRequestException, NotFoundException
from src.modules.face.presenter.dtos import VerifyFaceResponseDto
from src.modules.users.ports.output import IUserRepoDep


class VerifyFaceUsecase:
    def __init__(self, user_repo: IUserRepoDep):
        self.user_repo = user_repo

    async def execute(self, user_id: str, image_bytes: bytes) -> VerifyFaceResponseDto:
        user = self.user_repo.find_by_id(user_id)
        if user is None:
            raise NotFoundException("User not found")
        if user.face_encoding is None:
            raise BadRequestException("User has no registered face")

        image = face_recognition.load_image_file(BytesIO(image_bytes))
        encodings = face_recognition.face_encodings(image)
        if not encodings:
            raise BadRequestException("No face detected in the image. Please try again with a clearer photo.")

        test_encoding = encodings[0]
        known_encoding = np.array(user.face_encoding)
        results = face_recognition.compare_faces([known_encoding], test_encoding, tolerance=0.6)
        matched = bool(results[0])

        return VerifyFaceResponseDto(matched=matched, user_id=user_id, name=user.username)


VerifyFaceUsecaseDep = Annotated[VerifyFaceUsecase, Depends(VerifyFaceUsecase)]
