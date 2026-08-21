"""Link table joining a CV to each skill extracted from it."""

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import MYSQL_TABLE_ARGS, Base


class CVSkill(Base):
    __tablename__ = "cv_skills"
    __table_args__ = (
        # The same skill should only be recorded once per CV
        UniqueConstraint("cv_id", "skill_id", name="uq_cv_skills_cv_skill"),
        MYSQL_TABLE_ARGS,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cv_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True
    )

    cv: Mapped["CV"] = relationship(back_populates="cv_skills")
    skill: Mapped["Skill"] = relationship(back_populates="cv_skills")

    def __repr__(self) -> str:
        return f"<CVSkill cv_id={self.cv_id} skill_id={self.skill_id}>"
