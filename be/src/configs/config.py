from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    app_name: str = "My FastAPI Application"
    port: int = 8000
    db_url: str
    aws_region: str = "us-east-1"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_rekognition_similarity_threshold: float = 80.0

    model_config = SettingsConfigDict(env_file=".env")


config = Config()