from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve project directories dynamically to ensure .env is found from root or backend
CURRENT_FILE = Path(__file__).resolve()
APP_DIR = CURRENT_FILE.parents[1]        # .../backend/app
BACKEND_DIR = CURRENT_FILE.parents[2]    # .../backend
ROOT_DIR = CURRENT_FILE.parents[3]       # .../siftrix (project root)


class Settings(BaseSettings):
    """Application configuration loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=(
            ROOT_DIR / ".env",
            BACKEND_DIR / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Project metadata
    PROJECT_NAME: str = "Siftrix API"
    PROJECT_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # CORS settings (configurable for local Vite and production deployment)
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    # PostgreSQL Database URL (Local & Railway)
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/siftrix"

    # External APIs (no secrets hardcoded)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    GEMINI_TIMEOUT: float = 30.0

    VIRUSTOTAL_API_KEY: str = ""
    VIRUSTOTAL_TIMEOUT: float = 10.0

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_flag(cls, v: Union[str, bool, int]) -> bool:
        """Parse debug flag gracefully, handling host strings like 'release' or 'prod'."""
        if isinstance(v, bool):
            return v
        if isinstance(v, (int, float)):
            return bool(v)
        if isinstance(v, str):
            normalized = v.strip().lower()
            if normalized in ("true", "1", "yes", "dev", "development", "debug"):
                return True
            if normalized in ("false", "0", "no", "release", "prod", "production"):
                return False
        return bool(v)

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Normalize postgres:// or postgresql:// to postgresql+psycopg:// for Railway & psycopg 3."""
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+psycopg://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+"):
                return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v


settings = Settings()
