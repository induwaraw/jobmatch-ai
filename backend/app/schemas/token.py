"""Schemas for the access token."""

from pydantic import BaseModel


class Token(BaseModel):
    """What the login endpoint returns."""

    access_token: str

    # "bearer" is the type name clients expect in the Authorization header
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """The claims carried inside an access token."""

    sub: str
    exp: int
    iat: int
    type: str
