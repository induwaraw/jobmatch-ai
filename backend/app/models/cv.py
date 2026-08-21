"""Uploaded CV documents and their extracted plain text."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import MYSQL_TABLE_ARGS, Base


class CV(Base):
    __tablename__ = "cvs"
    __table_args__ = MYSQL_TABLE_ARGS

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    filename: Mapped[str] = mapped_column(String(255), nullable=False)

    # Full text pulled out of the PDF or DOCX, can be large
    raw_text: Mapped[str | None] = mapped_column(LONGTEXT, nullable=True)

    # Set to true once skill extraction has run over raw_text
    parsed: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="cvs")
    cv_skills: Mapped[list["CVSkill"]] = relationship(
        back_populates="cv", cascade="all, delete-orphan"
    )
    matches: Mapped[list["Match"]] = relationship(
        back_populates="cv", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CV id={self.id} filename={self.filename!r} parsed={self.parsed}>"
