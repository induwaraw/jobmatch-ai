"""Public job browsing.

No token needed. Anyone can look through the open vacancies. What is gated is
the match score, which needs a CV and therefore an account.

Three things have to be true for a vacancy to appear here:

  1. It has real description text. TopJobs adverts are images, so their stored
     description is a placeholder and there is nothing to read.
  2. The classifier gave it one of the six IT subcategories.
  3. At least MIN_SKILLS IT skills were found in its description.

The third condition is the one that matters in practice. XpressJobs lists
construction and manufacturing quality roles under its Quality Assurance
sector, so titles like "Quantity Surveyor" and "Quality Controller" arrive
labelled QA. They pass the first two checks but contain no IT skills at all,
and a job with no named technology cannot be matched against a CV anyway.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models.employer import Employer
from app.models.job import SUBCATEGORIES, Job
from app.schemas.job import JobDetail, JobListResponse, JobSummary
from app.services.matcher import (
    job_required_skills,
    job_subcategory,
    open_job_conditions,
    real_text_conditions,
)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

SNIPPET_CHARS = 220
MAX_LIMIT = 50

# A vacancy needs at least this many named IT skills to count as an IT job.
# Two rather than one, because a single incidental mention is often a false
# positive in an otherwise non technical advert.
MIN_SKILLS = 2


def _snippet(description: str | None) -> str:
    text = " ".join((description or "").split())
    if len(text) <= SNIPPET_CHARS:
        return text
    # Trim at a word boundary so the snippet does not end mid word
    cut = text[:SNIPPET_CHARS].rsplit(" ", 1)[0]
    return f"{cut}..."


def _label_expression():
    """The subcategory shown and filtered on: predicted first, scraped second."""
    return func.coalesce(Job.predicted_subcategory, Job.subcategory)


@router.get("", response_model=JobListResponse)
def list_jobs(
    q: str | None = Query(None, description="Search the job title or company name"),
    subcategory: str | None = Query(None, description="One of the six IT areas"),
    limit: int = Query(20, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> JobListResponse:
    """Browse the open vacancies."""
    if subcategory and subcategory not in SUBCATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown area. Expected one of {', '.join(SUBCATEGORIES)}.",
        )

    conditions = [
        *open_job_conditions(),
        *real_text_conditions(),
        # The classifier must have placed it in one of the six IT areas
        Job.predicted_subcategory.isnot(None),
        Job.predicted_subcategory.in_(SUBCATEGORIES),
    ]

    if subcategory:
        conditions.append(_label_expression() == subcategory)

    if q and q.strip():
        term = f"%{q.strip()}%"
        conditions.append(or_(Job.title.like(term), Employer.name.like(term)))

    # Skill counts are worked out from the description text rather than stored
    # in a column, so the skill filter cannot run in SQL. The candidate set is
    # small and the profiles are cached, so it is filtered in Python and
    # paginated afterwards.
    candidates = list(
        db.scalars(
            select(Job)
            .outerjoin(Employer, Job.employer_id == Employer.id)
            .where(*conditions)
            .options(selectinload(Job.employer))
            .order_by(Job.first_seen.desc(), Job.id.desc())
        ).all()
    )

    with_skills = [
        (job, skills)
        for job, skills in ((job, job_required_skills(job)) for job in candidates)
        if len(skills) >= MIN_SKILLS
    ]

    # Richest in named technology first. A genuine IT advert names many tools,
    # while a food or construction quality role scrapes through on the two
    # generic terms "quality assurance" and "quality control". Sorting this way
    # puts the unambiguously technical roles at the top, where recency alone
    # would lead with whatever happened to be scraped last.
    with_skills.sort(
        key=lambda pair: (len(pair[1]), pair[0].first_seen or datetime.min, pair[0].id),
        reverse=True,
    )

    total = len(with_skills)
    page = with_skills[offset : offset + limit]

    jobs = [
        JobSummary(
            id=job.id,
            title=job.title,
            company_name=job.employer.name if job.employer else None,
            location=job.location,
            subcategory=job_subcategory(job),
            source=job.source,
            snippet=_snippet(job.description),
            skill_count=len(skills),
            first_seen=job.first_seen,
            expiry_date=job.expiry_date,
        )
        for job, skills in page
    ]

    return JobListResponse(
        total=total,
        limit=limit,
        offset=offset,
        returned=len(jobs),
        jobs=jobs,
    )


@router.get("/{job_id}", response_model=JobDetail)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobDetail:
    """One vacancy in full."""
    job = db.scalar(
        select(Job).options(selectinload(Job.employer)).where(Job.id == job_id)
    )
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )

    skills = sorted(job_required_skills(job))

    return JobDetail(
        id=job.id,
        title=job.title,
        company_name=job.employer.name if job.employer else None,
        location=job.location,
        subcategory=job_subcategory(job),
        scraped_subcategory=job.subcategory,
        source=job.source,
        url=job.url,
        description=job.description or "",
        required_skills=skills,
        skill_count=len(skills),
        first_seen=job.first_seen,
        last_seen=job.last_seen,
        expiry_date=job.expiry_date,
        is_active=bool(job.is_active),
    )
