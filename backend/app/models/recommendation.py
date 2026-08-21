"""Learning suggestions generated for a user, such as a course for a missing skill."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import MYSQL_TABLE_ARGS, Base


class Recommendation(Base):
    __tablename__ = "recommendations"
    __table_args__ = MYSQL_TABLE_ARGS

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # What is being recommended, for example 'course' or 'certification'
    kind: Mapped[str] = mapped_column(String(40), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Skill name this recommendation is meant to close the gap on
    related_skill: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="recommendations")

    def __repr__(self) -> str:
        return f"<Recommendation id={self.id} kind={self.kind!r} title={self.title!r}>"
