from pathlib import Path
from typing import List, Union
from pydantic import ValidationInfo, field_validator
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
    ENVIRONMENT: str = "development"
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

    # Authentication & JWT Security
    # In production (Railway), JWT_SECRET_KEY must be configured via environment variables.
    # A distinct development-only fallback is used locally when no environment variable is set.
    JWT_SECRET_KEY: str = "siftrix-development-only-jwt-secret-do-not-use-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days (10,080 minutes)

    @field_validator("JWT_SECRET_KEY", mode="before")
    @classmethod
    def validate_jwt_secret_key(cls, v: Union[str, None], info: ValidationInfo) -> str:
        """Ensure JWT secret key is valid and prohibit default fallback in production.

        In production (Railway or ENVIRONMENT=production), a strong custom JWT_SECRET_KEY
        of at least 32 characters must be configured via environment variables.
        """
        import os

        dev_default = "siftrix-development-only-jwt-secret-do-not-use-in-production"
        railway_env = os.getenv("RAILWAY_ENVIRONMENT", "").strip()
        env_val = ""
        if info is not None and hasattr(info, "data") and "ENVIRONMENT" in info.data:
            env_val = str(info.data.get("ENVIRONMENT") or "").strip().lower()
        if not env_val:
            env_val = os.getenv("ENVIRONMENT", "").strip().lower()

        is_production = bool(
            railway_env
            or env_val in ("prod", "production")
        )
        val = v.strip() if isinstance(v, str) and v.strip() else None

        if is_production:
            if not val or val == dev_default:
                raise ValueError(
                    "A secure, non-default JWT_SECRET_KEY environment variable is strictly required in production."
                )
            if len(val) < 32:
                raise ValueError(
                    "Production JWT_SECRET_KEY must be at least 32 characters long."
                )
            return val

        return val or dev_default

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
