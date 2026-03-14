from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
from typing import List

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "KanoonEdge API"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = ""

    # JWT
    SECRET_KEY: str = "kanoonedge-dev-secret-key-change-in-production"
    JWT_SECRET_KEY: str = "kanoonedge-dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440  # 24 hours

    # File storage (local for dev, S3 for prod)
    UPLOAD_DIR: str = "uploads"
    FRONTEND_BASE_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003"

    # Google Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    @property
    def resolved_database_url(self) -> str:
        # Railway often provides postgres:// while SQLAlchemy expects postgresql://
        url = (self.DATABASE_URL or "").strip()
        if url:
            if url.startswith("postgres://"):
                return "postgresql://" + url[len("postgres://"):]
            return url
        return "sqlite:///./kanoonedge.db"

    @property
    def resolved_jwt_secret(self) -> str:
        # Keep backward compatibility while allowing canonical SECRET_KEY.
        return (self.SECRET_KEY or self.JWT_SECRET_KEY or "kanoonedge-dev-secret-key-change-in-production").strip()

    @property
    def allowed_origins_list(self) -> List[str]:
        raw = self.ALLOWED_ORIGINS or ""
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    model_config = {"env_file": str(_ENV_FILE), "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
