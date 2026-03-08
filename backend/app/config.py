from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "KanoonEdge API"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://kanoonedge:kanoonedge@localhost:5432/kanoonedge"

    # JWT
    JWT_SECRET_KEY: str = "kanoonedge-dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440  # 24 hours

    # File storage (local for dev, S3 for prod)
    UPLOAD_DIR: str = "uploads"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
