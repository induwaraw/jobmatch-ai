"""Job vacancies collected from Sri Lankan IT job boards."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import MYSQL_TABLE_ARGS, Base

# Allowed values for Job.subcategory. Stored as a plain string rather than an
# enum so the list can change without a migration.
SUBCATEGORIES = (
    "Software Engineering",
    "Data Science",
    "Cyber Security",
    "DevOps",
    "QA",
    "UI/UX",
)


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        # A job board's own id is what makes a listing unique, so re-running a
        # scraper updates the existing row instead of adding a duplicate.
        UniqueConstraint("source", "source_job_id", name="uq_jobs_source_job_id"),
        MYSQL_TABLE_ARGS,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Nullable because a listing may not name a recognisable employer
    employer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("employers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(LONGTEXT, nullable=True)

    # One of SUBCATEGORIES above, also the grouping key used by the forecasts
    subcategory: Mapped[str] = mapped_column(String(60), nullable=False, index=True)

    location: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Which job board the listing came from
    source: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)

    # The id this listing has on that job board, kept as a string so any
    # source's id format fits. Together with source it identifies the listing.
    source_job_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    scraped_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )

    # When we first saw this listing. Set once on insert and never changed
    # afterwards, so it records the real date the job entered our data.
    first_seen: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )

    # Refreshed every scrape run in which the listing is still present
    last_seen: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )

    # Closing date as stated by the source, null when the source does not give one
    expiry_date: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, index=True
    )

    # A job counts as open until its stated expiry date has passed
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="1", index=True
    )

    employer: Mapped["Employer | None"] = relationship(back_populates="jobs")
    matches: Mapped[list["Match"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Job id={self.id} title={self.title!r} subcategory={self.subcategory!r}>"
