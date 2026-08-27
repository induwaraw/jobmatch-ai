"""Schemas for the public job browsing endpoints."""

from datetime import datetime

from pydantic import BaseModel


class JobSummary(BaseModel):
    """One job in the browse list."""

    id: int
    title: str
    company_name: str | None
    location: str | None
    subcategory: str | None
    source: str | None
    snippet: str
    skill_count: int
    first_seen: datetime | None
    expiry_date: datetime | None


class JobListResponse(BaseModel):
    """What GET /api/jobs returns."""

    total: int
    limit: int
    offset: int
    returned: int
    jobs: list[JobSummary]


class JobDetail(BaseModel):
    """What GET /api/jobs/{id} returns."""

    id: int
    title: str
    company_name: str | None
    location: str | None
    subcategory: str | None
    scraped_subcategory: str | None
    source: str | None
    url: str | None
    description: str
    required_skills: list[str]
    skill_count: int
    first_seen: datetime | None
    last_seen: datetime | None
    expiry_date: datetime | None
    is_active: bool
