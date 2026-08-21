"""Companies that advertise the scraped vacancies."""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import MYSQL_TABLE_ARGS, Base


class Employer(Base):
    __tablename__ = "employers"
    __table_args__ = MYSQL_TABLE_ARGS

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(150), nullable=True)

    jobs: Mapped[list["Job"]] = relationship(back_populates="employer")

    def __repr__(self) -> str:
        return f"<Employer id={self.id} name={self.name!r}>"
