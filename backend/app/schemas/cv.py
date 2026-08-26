"""Schemas for the CV endpoints.

The full extracted text is never returned by the API. Uploads return a short
preview only, and the list endpoint returns metadata.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

# How much of the extracted text the upload response shows back
PREVIEW_CHARS = 300


class CVUploadResponse(BaseModel):
    """What POST /api/cv/upload returns."""

    id: int
    filename: str
    file_type: str
    character_count: int
    preview: str
    uploaded_at: datetime


class CVSummary(BaseModel):
    """One row in GET /api/cv/mine."""

    id: int
    filename: str
    uploaded_at: datetime
    character_count: int
    parsed: bool

    model_config = ConfigDict(from_attributes=True)
