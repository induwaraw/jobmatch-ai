"""Registration, login and the current user route."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _get_user_by_email(db: Session, email: str) -> User | None:
    """Look up a user by email address."""
    return db.scalar(select(User).where(User.email == email))


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    """Create an account and return it without the password hash."""
    # Emails are stored lowercase so the same address cannot register twice
    # under a different capitalisation.
    email = payload.email.lower()

    if _get_user_by_email(db, email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
    )

    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Covers the rare case where another request registered the same email
        # between the check above and this commit.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Check the credentials and hand back an access token."""
    user = _get_user_by_email(db, payload.email.lower())

    # The same message is used whether the email is unknown or the password is
    # wrong, so the response cannot be used to discover which emails exist.
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive",
        )

    return Token(access_token=create_access_token(subject=user.id))


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Return the details of whoever owns the token in the request."""
    return current_user
