"""CV to job matching.

Combines the two models:
  - the spaCy skill extractor, for the skill overlap
  - the DistilBERT subcategory classifier, for the field match

Score for one job:

    coverage    = matched required skills / total required skills
    overlap     = matched required skills / OVERLAP_CAP, capped at 1.0
    skill_score = 100 * (COVERAGE_WEIGHT * coverage + OVERLAP_WEIGHT * overlap)
                  plus a small bonus for shared General/Tools skills
    field_score = 100 if the CV and the job share a subcategory, else 0
    final_score = SKILL_WEIGHT * skill_score + FIELD_WEIGHT * field_score

Two things the blend fixes. Coverage on its own rewards thin job adverts,
because matching 3 of 6 listed skills beats matching 4 of 24 even though the
second CV knows more of what the job needs. The overlap term restores credit
for absolute depth. Separately, skills that are only General/Tools, such as
Communication Skills or Microsoft Excel, are left out of the required set, so
they neither inflate the denominator nor show up as missing core requirements.

Only jobs with real description text are considered. TopJobs rows carry a
placeholder because their adverts are images, so they are excluded here and
are only used for the vacancy volume forecasting.
"""

import logging
from dataclasses import dataclass, field

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.cv import CV
from app.models.job import Job
# The same "open until its closing date" rule the scrapers use, so the API and
# the scraper agree on what counts as an open vacancy.
from app.scrapers.common import start_of_today
from app.services.classifier import MODE_FALLBACK, get_classifier
from app.services.skill_extractor import get_skill_extractor

logger = logging.getLogger(__name__)

# Tune these two together, they should add up to 1.0
SKILL_WEIGHT = 0.70
FIELD_WEIGHT = 0.30

# How the skill score splits between "what fraction of the job's list do you
# have" and "how many of its skills do you have in absolute terms". These two
# should add up to 1.0 as well. Overlap leads, because coverage on its own put
# a thin 5 skill advert above a detailed 21 skill one that the CV matched
# better in absolute terms.
COVERAGE_WEIGHT = 0.40
OVERLAP_WEIGHT = 0.60

# Matching this many of a job's required skills counts as full marks on the
# absolute overlap term.
OVERLAP_CAP = 10

# Cross-cutting skills are a bonus, never a requirement
GENERAL_SUBCATEGORY = "General/Tools"
GENERAL_BONUS_MAX = 5.0
GENERAL_BONUS_CAP = 3

DEFAULT_TOP_N = 20

# Jobs whose description starts with this are TopJobs placeholder rows
PLACEHOLDER_PREFIX = "Description not available"

# A job needs at least this many extracted required skills to be worth
# scoring. Jobs below this are adverts written in prose that name no tools, so
# there is nothing to match on.
MIN_JOB_SKILLS = 2


@dataclass
class JobMatch:
    job_id: int
    title: str
    company_name: str | None
    # The label used for field matching
    subcategory: str | None
    # The raw scraped label, kept so the UI can show both
    scraped_subcategory: str | None
    subcategory_source: str
    location: str | None
    url: str | None
    match_score: int
    skill_score: int
    # Fractional, because it is scaled by the classifier's confidence
    field_score: float
    classifier_confidence: float | None
    matched_skills: list[str] = field(default_factory=list)
    missing_skills: list[str] = field(default_factory=list)
    # Required skills only, General/Tools are excluded from both
    job_skill_count: int = 0
    matched_count: int = 0
    matched_general_skills: list[str] = field(default_factory=list)
    general_bonus: float = 0.0


@dataclass
class MatchResult:
    cv_id: int
    cv_subcategory: str | None
    cv_subcategory_confidence: float | None
    classifier_mode: str
    cv_skill_count: int
    cv_skills: list[str]
    # Open vacancies with real description text that were scored
    jobs_considered: int
    # Vacancies with text that were left out because they have closed
    jobs_excluded_closed: int
    jobs_skipped_no_skills: int
    matches: list[JobMatch]


@dataclass
class _JobProfile:
    """What we work out about a job once and then reuse."""

    # Skills that carry at least one real subcategory
    required_skills: set[str]
    # Skills whose only subcategory is General/Tools
    general_skills: set[str]
    # The subcategory field matching actually compares against
    subcategory: str | None
    # Where that subcategory came from: "predicted", "live model" or "scraped"
    subcategory_source: str
    # How sure the classifier was. None when the label did not come from a
    # model, which means the job earns no field score at all.
    confidence: float | None


# Job text does not change between scrapes, so the extracted skills and
# subcategory are cached in memory. The key includes scraped_at so a re-scrape
# that changes the description invalidates the entry.
_job_cache: dict[tuple[int, str], _JobProfile] = {}


def clear_job_cache() -> None:
    _job_cache.clear()


def is_general_only(subcategories: list[str]) -> bool:
    """True when a skill carries no subcategory other than General/Tools.

    Git is DevOps, Software Engineering and General/Tools, so it stays a real
    requirement. Communication Skills is only General/Tools, so it does not.
    """
    return set(subcategories) == {GENERAL_SUBCATEGORY}


def _job_profile(job: Job) -> _JobProfile:
    key = (job.id, str(job.scraped_at))
    cached = _job_cache.get(key)
    if cached is not None:
        return cached

    extractor = get_skill_extractor()
    classifier = get_classifier()

    matches = extractor.extract(job.description or "")

    required, general = set(), set()
    for m in matches:
        if is_general_only(m.subcategories):
            general.add(m.name)
        else:
            required.add(m.name)

    # Prefer the label the trained classifier gave this job. It was produced
    # offline from the description text, so it is far better than the scraped
    # label, which only records which category page the job was listed under.
    if job.predicted_subcategory:
        subcategory = job.predicted_subcategory
        source = "predicted"
        confidence = job.classifier_confidence
    elif classifier.available:
        result = classifier.classify(job.description or "", skills=matches)
        subcategory = result.subcategory or job.subcategory
        source = "live model"
        confidence = result.confidence
    else:
        subcategory = job.subcategory
        source = "scraped"
        confidence = None

    profile = _JobProfile(
        required_skills=required,
        general_skills=general,
        subcategory=subcategory,
        subcategory_source=source,
        confidence=confidence,
    )
    _job_cache[key] = profile
    return profile


def _has_real_text():
    """Conditions for a job whose description is worth matching against."""
    return (
        Job.description.isnot(None),
        Job.description != "",
        Job.description.notlike(f"{PLACEHOLDER_PREFIX}%"),
    )


def open_job_conditions():
    """Conditions for a vacancy that is still open, for reuse by the API."""
    return (
        Job.is_active.is_(True),
        or_(Job.expiry_date.is_(None), Job.expiry_date >= start_of_today()),
    )


def real_text_conditions():
    """Conditions for a job whose description is real text, not a placeholder."""
    return _has_real_text()


def job_required_skills(job: Job) -> set[str]:
    """The skills a job asks for, excluding cross cutting General/Tools ones.

    Uses the same cached profile the matcher uses, so the count shown when
    browsing agrees with the count shown in a match.
    """
    return _job_profile(job).required_skills


def job_subcategory(job: Job) -> str | None:
    """The classifier's label where there is one, otherwise the scraped label."""
    return job.predicted_subcategory or job.subcategory


def _eligible_jobs(db: Session) -> tuple[list[Job], int]:
    """Open jobs with real description text, plus how many closed ones we skipped.

    A closed vacancy is no use to someone applying, so expired and inactive
    jobs are left out rather than padding the results.
    """
    today = start_of_today()
    open_only = (
        Job.is_active.is_(True),
        or_(Job.expiry_date.is_(None), Job.expiry_date >= today),
    )

    jobs = list(
        db.scalars(
            select(Job)
            .options(selectinload(Job.employer))
            .where(*_has_real_text(), *open_only)
        ).all()
    )

    with_text = db.scalar(
        select(func.count()).select_from(Job).where(*_has_real_text())
    )
    return jobs, int(with_text or 0) - len(jobs)


def match_cv_to_jobs(
    db: Session, cv: CV, top_n: int = DEFAULT_TOP_N
) -> MatchResult:
    """Score every eligible job against one CV and return the best matches."""
    extractor = get_skill_extractor()
    classifier = get_classifier()

    cv_matches = extractor.extract(cv.raw_text or "")
    cv_skills = {m.name for m in cv_matches}

    cv_class = classifier.classify(cv.raw_text or "", skills=cv_matches)

    jobs, excluded_closed = _eligible_jobs(db)
    results: list[JobMatch] = []
    skipped = 0

    for job in jobs:
        profile = _job_profile(job)

        if len(profile.required_skills) < MIN_JOB_SKILLS:
            # Too few real skills to score fairly, so leave it out rather than
            # report a misleading 0 or 100 percent.
            skipped += 1
            continue

        matched = sorted(profile.required_skills & cv_skills)
        missing = sorted(profile.required_skills - cv_skills)
        matched_general = sorted(profile.general_skills & cv_skills)

        coverage = len(matched) / len(profile.required_skills)
        overlap = min(len(matched) / OVERLAP_CAP, 1.0)

        # Cross-cutting skills only ever add, they are never a requirement
        bonus = GENERAL_BONUS_MAX * min(
            len(matched_general) / GENERAL_BONUS_CAP, 1.0
        )

        skill_score = min(
            100.0,
            100 * (COVERAGE_WEIGHT * coverage + OVERLAP_WEIGHT * overlap) + bonus,
        )
        # The field bonus is scaled by how sure the classifier was about the
        # job, so a confident Data Science label is worth far more than a
        # borderline one. No confidence means no field score.
        same_field = bool(
            cv_class.subcategory
            and profile.subcategory
            and cv_class.subcategory == profile.subcategory
        )
        field_score = (
            100.0 * profile.confidence
            if same_field and profile.confidence is not None
            else 0.0
        )

        final = SKILL_WEIGHT * skill_score + FIELD_WEIGHT * field_score

        results.append(
            JobMatch(
                job_id=job.id,
                title=job.title,
                company_name=job.employer.name if job.employer else None,
                subcategory=profile.subcategory,
                scraped_subcategory=job.subcategory,
                subcategory_source=profile.subcategory_source,
                location=job.location,
                url=job.url,
                match_score=round(final),
                skill_score=round(skill_score),
                field_score=round(field_score, 1),
                classifier_confidence=profile.confidence,
                matched_skills=matched,
                missing_skills=missing,
                job_skill_count=len(profile.required_skills),
                matched_count=len(matched),
                matched_general_skills=matched_general,
                general_bonus=round(bonus, 1),
            )
        )

    # Highest score first, then the job with more overlapping skills, so two
    # jobs on the same percentage are not ordered arbitrarily.
    results.sort(key=lambda m: (m.match_score, len(m.matched_skills)), reverse=True)

    return MatchResult(
        cv_id=cv.id,
        cv_subcategory=cv_class.subcategory,
        cv_subcategory_confidence=cv_class.confidence,
        classifier_mode=cv_class.mode or MODE_FALLBACK,
        cv_skill_count=len(cv_skills),
        cv_skills=sorted(cv_skills),
        jobs_considered=len(jobs),
        jobs_excluded_closed=excluded_closed,
        jobs_skipped_no_skills=skipped,
        matches=results[:top_n],
    )
