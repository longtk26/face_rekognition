from fastapi import APIRouter, File, Form, UploadFile, status

from src.modules.face.presenter.dtos import RegisterFaceResponseDto, VerifyFaceResponseDto
from src.modules.face.usecases import RegisterFaceUsecaseDep, VerifyFaceUsecaseDep

face_router = APIRouter(prefix="/face", tags=["face"])


@face_router.post("/register", response_model=RegisterFaceResponseDto, status_code=status.HTTP_201_CREATED)
async def register_face(
    usecase: RegisterFaceUsecaseDep,
    name: str = Form(...),
    image: UploadFile = File(...),
) -> RegisterFaceResponseDto:
    image_bytes = await image.read()
    return await usecase.execute(name, image_bytes)


@face_router.post("/verify", response_model=VerifyFaceResponseDto)
async def verify_face(
    usecase: VerifyFaceUsecaseDep,
    user_id: str = Form(...),
    image: UploadFile = File(...),
) -> VerifyFaceResponseDto:
    image_bytes = await image.read()
    return await usecase.execute(user_id, image_bytes)
