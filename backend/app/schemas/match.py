"""Schemas for the matching endpoint."""

from pydantic import BaseModel


class JobMatchOut(BaseModel):
    """One ranked job."""

    job_id: int
    title: str
    company_name: str | None

    # The label field matching used, from the classifier where available
    subcategory: str | None
    # The raw label the scraper recorded, shown alongside for transparency
    scraped_subcategory: str | None
    # "predicted", "live model" or "scraped"
    subcategory_source: str

    location: str | None
    url: str | None
    match_score: int
    skill_score: int
    # Scaled by the classifier's confidence in the job's label, so fractional
    field_score: float
    classifier_confidence: float | None

    # Required skills only, cross-cutting General/Tools skills are excluded
    job_skill_count: int
    matched_count: int
    matched_skills: list[str]
    missing_skills: list[str]

    # Shared cross-cutting skills, a bonus rather than a requirement
    matched_general_skills: list[str]
    general_bonus: float


class MatchResponse(BaseModel):
    """What GET /api/match/{cv_id} returns."""

    cv_id: int
    cv_subcategory: str | None
    cv_subcategory_confidence: float | None

    # "model" when the DistilBERT classifier was used, "fallback" otherwise
    classifier_mode: str

    cv_skill_count: int
    cv_skills: list[str]

    # Open vacancies with real text that were scored
    jobs_considered: int
    # Vacancies with text left out because they have already closed
    jobs_excluded_closed: int
    jobs_skipped_no_skills: int
    returned: int
    matches: list[JobMatchOut]
