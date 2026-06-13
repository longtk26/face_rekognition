from pydantic import BaseModel


class RegisterFaceResponseDto(BaseModel):
    id: str
    name: str


class VerifyFaceResponseDto(BaseModel):
    matched: bool
    user_id: str
    name: str
