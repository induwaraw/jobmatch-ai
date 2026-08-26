"""Schemas for the matching endpoint."""

from pydantic import BaseModel


class JobMatchOut(BaseModel):
    """One ranked job."""

    job_id: int
    title: str
    company_name: str | None
    subcategory: str | None
    location: str | None
    url: str | None
    match_score: int
    skill_score: int
    field_score: int

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
    jobs_considered: int
    jobs_skipped_no_skills: int
    returned: int
    matches: list[JobMatchOut]
