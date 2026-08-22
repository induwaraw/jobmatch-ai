"""Password hashing and JWT access tokens.

Passwords are only ever stored as a bcrypt hash. The plain password is used to
create or check a hash and is never written to the database or returned by the
API.
"""

from datetime import datetime, timedelta, timezone

import jwt
from jwt import InvalidTokenError
from passlib.context import CryptContext

from app.core.config import settings

# bcrypt is pinned to 4.0.1 in requirements because passlib does not work with
# 4.1 or newer. See CLAUDE.md.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# bcrypt only looks at the first 72 bytes of a password. Registration rejects
# anything longer rather than silently ignoring the rest.
MAX_PASSWORD_BYTES = 72


def hash_password(plain_password: str) -> str:
    """Turn a plain password into a bcrypt hash for storage."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Check a plain password against a stored hash."""
    try:
        return pwd_context.verify(plain_password, password_hash)
    except ValueError:
        # Raised when the stored value is not a valid bcrypt hash, which should
        # not happen but is treated as a failed login rather than a crash.
        return False


def create_access_token(subject: int | str, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT for the given user id.

    The user id goes in the standard "sub" claim as a string, which is what the
    JWT specification expects.
    """
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload = {
        "sub": str(subject),
        "iat": issued_at,
        "exp": expires_at,
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decode and validate a token, returning None if it is not usable.

    Returns None for a bad signature, an expired token, a malformed token or a
    token that is not an access token. The caller turns that into a 401.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except InvalidTokenError:
        # ExpiredSignatureError and the other PyJWT errors all inherit from this
        return None

    if payload.get("type") != "access":
        return None

    return payload
