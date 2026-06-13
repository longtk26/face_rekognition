from abc import ABC, abstractmethod
from src.modules.shared.domain.entities import UserEntity


class IUserRepository(ABC):
    @abstractmethod
    def create(self, user: UserEntity) -> UserEntity:
        pass

    @abstractmethod
    def find_by_id(self, user_id: str) -> UserEntity | None:
        pass

    @abstractmethod
    def find_all(self) -> list[UserEntity]:
        pass
