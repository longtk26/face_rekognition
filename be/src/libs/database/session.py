from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, create_engine, SQLModel
from src.configs import config

class DBSessionManager: 
    def __init__(self):
        self.engine = self.create_db_engine(config.db_url)

    def create_db_engine(self, db_url: str):
        return create_engine(db_url)

    def create_db_and_tables(self):
        SQLModel.metadata.create_all(self.engine)

    def get_session(self):
        with Session(self.engine) as session:
            yield session

SessionDep = Annotated[Session, Depends(DBSessionManager().get_session)]