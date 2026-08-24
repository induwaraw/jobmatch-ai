"""Helpers shared by the job scrapers."""

from datetime import datetime

import requests
from sqlalchemy import case, func, select, update
from sqlalchemy.orm import Session

from app.models.employer import Employer
from app.models.job import Job

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def build_session(accept: str = "application/json, text/plain, */*") -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept": accept,
            "Accept-Language": "en-US,en;q=0.9",
        }
    )
    return session


def start_of_today() -> datetime:
    return datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)


def is_job_active(expiry_date: datetime | None) -> bool:
    """A job stays open until its closing date has passed.

    A job closing today still counts as open. A job with no closing date is
    treated as open, because the source has not said otherwise and assuming it
    is closed would drop real vacancies from the demand figures.
    """
    if expiry_date is None:
        return True
    return expiry_date >= start_of_today()


def upsert_employer(db: Session, name: str | None) -> tuple[Employer | None, bool]:
    """Look up an employer by name, creating it if this is the first sighting.

    Returns the employer and whether it was created.
    """
    clean_name = (name or "").strip()
    if not clean_name:
        return None, False

    employer = db.scalar(select(Employer).where(Employer.name == clean_name))
    if employer is not None:
        return employer, False

    employer = Employer(name=clean_name[:200])
    db.add(employer)
    db.flush()
    return employer, True


def refresh_active_flags(db: Session, source: str) -> tuple[int, int]:
    """Recompute is_active for one source and return the active/expired split.

    Run this after a scrape so jobs that passed their closing date since the
    last run get marked inactive even if this run never touched their rows.
    """
    cutoff = start_of_today()

    db.execute(
        update(Job)
        .where(Job.source == source)
        .values(
            is_active=case(
                (Job.expiry_date.is_(None), True),
                (Job.expiry_date >= cutoff, True),
                else_=False,
            )
        )
    )
    db.commit()

    active = db.scalar(
        select(func.count()).select_from(Job).where(Job.source == source, Job.is_active.is_(True))
    )
    expired = db.scalar(
        select(func.count()).select_from(Job).where(Job.source == source, Job.is_active.is_(False))
    )
    return active or 0, expired or 0
