"""Similarity scores between a user's CV and a job vacancy."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import MYSQL_TABLE_ARGS, Base


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = MYSQL_TABLE_ARGS

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cv_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Match strength produced by the model, expected range 0.0 to 1.0
    score: Mapped[float] = mapped_column(Float, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="matches")
    cv: Mapped["CV"] = relationship(back_populates="matches")
    job: Mapped["Job"] = relationship(back_populates="matches")

    def __repr__(self) -> str:
        return f"<Match id={self.id} cv_id={self.cv_id} job_id={self.job_id} score={self.score}>"
