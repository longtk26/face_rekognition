from fastapi import HTTPException
from http import HTTPStatus
from typing import Any

class BaseException(HTTPException):
    def __init__(self, status_code: int, detail: Any):
        super().__init__(status_code=status_code, detail=detail)

class NotFoundException(BaseException):
    def __init__(self, detail: Any = "Resource not found"):
        super().__init__(status_code=HTTPStatus.NOT_FOUND, detail=detail)

class BadRequestException(BaseException):
    def __init__(self, detail: Any = "Bad request"):
        super().__init__(status_code=HTTPStatus.BAD_REQUEST, detail=detail)

class UnauthorizedException(BaseException):
    def __init__(self, detail: Any = "Unauthorized"):
        super().__init__(status_code=HTTPStatus.UNAUTHORIZED, detail=detail)

class ForbiddenException(BaseException):
    def __init__(self, detail: Any = "Forbidden"):
        super().__init__(status_code=HTTPStatus.FORBIDDEN, detail=detail)

class InternalServerErrorException(BaseException):
    def __init__(self, detail: Any = "Internal server error"):
        super().__init__(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=detail)
