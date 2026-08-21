"""SQLAlchemy models for JobMatch AI.

Everything is imported here so that importing this package registers all the
tables on Base.metadata. Alembic sees an empty schema otherwise.
"""

from app.models.audit_log import AuditLog
from app.models.cv import CV
from app.models.cv_skill import CVSkill
from app.models.employer import Employer
from app.models.forecast import Forecast
from app.models.job import Job
from app.models.match import Match
from app.models.recommendation import Recommendation
from app.models.skill import Skill
from app.models.user import User

__all__ = [
    "AuditLog",
    "CV",
    "CVSkill",
    "Employer",
    "Forecast",
    "Job",
    "Match",
    "Recommendation",
    "Skill",
    "User",
]
