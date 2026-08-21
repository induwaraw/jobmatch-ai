"""Registered account holders."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import MYSQL_TABLE_ARGS, Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = MYSQL_TABLE_ARGS

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)

    # 'user' or 'admin' for now, kept as a plain string to stay flexible
    role: Mapped[str] = mapped_column(String(20), nullable=False, server_default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    cvs: Mapped[list["CV"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    matches: Mapped[list["Match"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"
