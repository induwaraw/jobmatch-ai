"""Application configuration.

Settings are read from backend/.env so no credentials end up in the repository.
Nothing has a default, so a missing key fails at start up rather than later.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> parents[2] is the backend/ directory
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Values loaded from the environment or backend/.env."""

    # SQLAlchemy connection string, for example
    # mysql+pymysql://user:password@localhost:3306/jobmatch
    DATABASE_URL: str

    # Secret used to sign JWT access tokens
    JWT_SECRET: str

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Single shared instance imported across the application
settings = Settings()
