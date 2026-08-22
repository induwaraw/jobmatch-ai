"""Application configuration.

Settings are read from backend/.env so no credentials end up in the repository.
The secrets have no default, so a missing key fails at start up rather than
later. The token settings do have defaults, since they are tuning values and
not secrets.
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

    # Signing algorithm for the access tokens
    JWT_ALGORITHM: str = "HS256"

    # How long an access token stays valid, in minutes. 60 minutes is long
    # enough to work with comfortably and short enough to limit a leaked token.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Single shared instance imported across the application
settings = Settings()
