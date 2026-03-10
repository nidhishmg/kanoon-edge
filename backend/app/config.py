from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


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

    # Google Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    model_config = {"env_file": str(_ENV_FILE), "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
