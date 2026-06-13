from src.modules.health.presenter import health_router
from src.modules.users.presenter import user_router
from src.modules.face.presenter.router import face_router

all_router = [health_router, user_router, face_router]
