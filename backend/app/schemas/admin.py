"""Schemas for the admin panel."""

from pydantic import BaseModel


class CountByName(BaseModel):
    name: str
    count: int


class AdminStats(BaseModel):
    """Platform totals for the admin dashboard."""

    total_users: int
    active_users: int
    admin_users: int

    total_cvs: int
    parsed_cvs: int

    total_jobs: int
    open_jobs: int
    expired_jobs: int
    jobs_with_text: int
    total_employers: int

    total_skills: int
    total_forecasts: int

    jobs_by_subcategory: list[CountByName]
    jobs_by_source: list[CountByName]
