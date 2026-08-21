"""Canonical skill vocabulary, for example Python, Docker or Figma."""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import MYSQL_TABLE_ARGS, Base


class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = MYSQL_TABLE_ARGS

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)

    # Grouping such as 'language', 'framework', 'tool', 'soft'
    category: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)

    # Where the skill entry came from, such as 'seed' or 'extracted'
    source: Mapped[str | None] = mapped_column(String(80), nullable=True)

    cv_skills: Mapped[list["CVSkill"]] = relationship(
        back_populates="skill", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Skill id={self.id} name={self.name!r}>"
