
from pydantic_settings import BaseSettings, SettingsConfigDict

class Config(BaseSettings):
    app_name: str = "My FastAPI Application"
    port: int = 8000
    db_url: str 

    model_config = SettingsConfigDict(env_file=".env")

config = Config()