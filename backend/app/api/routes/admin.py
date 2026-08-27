"""Admin only endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.cv import CV
from app.models.employer import Employer
from app.models.forecast import Forecast
from app.models.job import Job
from app.models.skill import Skill
from app.models.user import User
from app.scrapers.common import start_of_today
from app.schemas.admin import AdminStats, CountByName
from app.services.matcher import PLACEHOLDER_PREFIX

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _count(db: Session, model, *conditions) -> int:
    stmt = select(func.count()).select_from(model)
    if conditions:
        stmt = stmt.where(*conditions)
    return int(db.scalar(stmt) or 0)


@router.get("/stats", response_model=AdminStats)
def platform_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> AdminStats:
    """Totals across the platform, for the admin dashboard."""
    today = start_of_today()
    still_open = (
        Job.is_active.is_(True),
        or_(Job.expiry_date.is_(None), Job.expiry_date >= today),
    )

    by_subcategory = db.execute(
        select(
            func.coalesce(Job.predicted_subcategory, Job.subcategory),
            func.count(),
        )
        .group_by(func.coalesce(Job.predicted_subcategory, Job.subcategory))
        .order_by(func.count().desc())
    ).all()

    by_source = db.execute(
        select(Job.source, func.count()).group_by(Job.source).order_by(func.count().desc())
    ).all()

    total_jobs = _count(db, Job)
    open_jobs = _count(db, Job, *still_open)

    return AdminStats(
        total_users=_count(db, User),
        active_users=_count(db, User, User.is_active.is_(True)),
        admin_users=_count(db, User, User.role == "admin"),
        total_cvs=_count(db, CV),
        parsed_cvs=_count(db, CV, CV.parsed.is_(True)),
        total_jobs=total_jobs,
        open_jobs=open_jobs,
        expired_jobs=total_jobs - open_jobs,
        jobs_with_text=_count(
            db,
            Job,
            Job.description.isnot(None),
            Job.description != "",
            Job.description.notlike(f"{PLACEHOLDER_PREFIX}%"),
        ),
        total_employers=_count(db, Employer),
        total_skills=_count(db, Skill),
        total_forecasts=_count(db, Forecast),
        jobs_by_subcategory=[
            CountByName(name=name or "Unclassified", count=n) for name, n in by_subcategory
        ],
        jobs_by_source=[
            CountByName(name=name or "unknown", count=n) for name, n in by_source
        ],
    )
