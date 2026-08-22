"""Shared dependencies for protected routes.

Any endpoint can be protected by depending on get_current_active_user:

    @router.get("/example")
    def example(current_user: User = Depends(get_current_active_user)):
        ...

A missing, malformed or expired token gives a 401 before the endpoint body ever
runs.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

# auto_error is off because the built in behaviour returns 403 for a missing
# header. We want 401 for anything to do with a missing or bad token, so the
# check is done here instead.
bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorised(detail: str) -> HTTPException:
    """Build a 401 that tells the client a bearer token is expected."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the Authorization header into the matching User row."""
    if credentials is None or not credentials.credentials:
        raise _unauthorised("Not authenticated")

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise _unauthorised("Invalid or expired token")

    subject = payload.get("sub")
    if subject is None:
        raise _unauthorised("Invalid or expired token")

    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        raise _unauthorised("Invalid or expired token")

    user = db.get(User, user_id)
    if user is None:
        # The token is signed correctly but the account is gone
        raise _unauthorised("User no longer exists")

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Same as get_current_user, but also rejects a deactivated account."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive",
        )
    return current_user
