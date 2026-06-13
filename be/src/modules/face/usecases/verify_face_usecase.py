import base64
from typing import Annotated

import boto3
from fastapi import Depends

from src.configs import config
from src.libs.exceptions.base_exception import BadRequestException, NotFoundException
from src.modules.face.presenter.dtos import VerifyFaceResponseDto
from src.modules.users.ports.output import IUserRepoDep

_rekognition_client = boto3.client(
    "rekognition",
    region_name=config.aws_region,
    **(
        {
            "aws_access_key_id": config.aws_access_key_id,
            "aws_secret_access_key": config.aws_secret_access_key,
        }
        if config.aws_access_key_id
        else {}
    ),
)


class VerifyFaceUsecase:
    def __init__(self, user_repo: IUserRepoDep):
        self.user_repo = user_repo

    async def execute(self, user_id: str, image_bytes: bytes) -> VerifyFaceResponseDto:
        user = self.user_repo.find_by_id(user_id)
        if user is None:
            raise NotFoundException("User not found")
        if user.face_image is None:
            raise BadRequestException("User has no registered face image")

        response = _rekognition_client.compare_faces(
            SourceImage={"Bytes": base64.b64decode(user.face_image)},
            TargetImage={"Bytes": image_bytes},
            SimilarityThreshold=config.aws_rekognition_similarity_threshold,
        )
        matched = len(response.get("FaceMatches", [])) > 0

        return VerifyFaceResponseDto(matched=matched, user_id=user_id, name=user.username)


VerifyFaceUsecaseDep = Annotated[VerifyFaceUsecase, Depends(VerifyFaceUsecase)]
