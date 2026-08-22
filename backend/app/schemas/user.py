"""Schemas for the user endpoints.

UserOut is the only user shape the API ever returns, and it has no
password_hash field, so a hash cannot leak into a response by accident.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.security import MAX_PASSWORD_BYTES

# Short enough not to annoy, long enough to be a real requirement
MIN_PASSWORD_LENGTH = 8


class UserCreate(BaseModel):
    """Body for POST /api/auth/register."""

    email: EmailStr
    password: str = Field(
        min_length=MIN_PASSWORD_LENGTH,
        max_length=MAX_PASSWORD_BYTES,
        description=f"At least {MIN_PASSWORD_LENGTH} characters",
    )
    full_name: str = Field(min_length=1, max_length=150)


class UserLogin(BaseModel):
    """Body for POST /api/auth/login."""

    email: EmailStr
    password: str


class UserOut(BaseModel):
    """A user as returned by the API. Note there is no password_hash here."""

    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    # Lets FastAPI build this straight from a SQLAlchemy User object
    model_config = ConfigDict(from_attributes=True)
