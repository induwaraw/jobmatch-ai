"""CV upload and listing."""

from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.cv import CV
from app.models.user import User
from app.schemas.cv import PREVIEW_CHARS, CVSummary, CVUploadResponse
from app.services.cv_extract import MAX_FILE_BYTES, CVExtractionError, extract_text

router = APIRouter(prefix="/api/cv", tags=["cv"])


@router.post(
    "/upload", response_model=CVUploadResponse, status_code=status.HTTP_201_CREATED
)
async def upload_cv(
    file: UploadFile = File(..., description="Your CV as a PDF or DOCX file"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CVUploadResponse:
    """Upload a CV, extract its text and store it against the current user."""
    data = await file.read()

    # Checked here as well as in the service so the error mentions the limit
    # before we spend time trying to parse a huge file.
    if len(data) > MAX_FILE_BYTES:
        limit_mb = MAX_FILE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File is too large. The maximum size is {limit_mb} MB.",
        )

    try:
        file_type, text = extract_text(
            data, filename=file.filename, content_type=file.content_type
        )
    except CVExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    cv = CV(
        user_id=current_user.id,
        filename=(file.filename or "cv")[:255],
        raw_text=text,
        parsed=True,
        uploaded_at=datetime.now(),
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)

    return CVUploadResponse(
        id=cv.id,
        filename=cv.filename,
        file_type=file_type,
        character_count=len(text),
        preview=text[:PREVIEW_CHARS],
        uploaded_at=cv.uploaded_at,
    )


@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete one of the current user's CVs and its extracted data."""
    cv = db.get(CV, cv_id)
    if cv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="CV not found"
        )
    if cv.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This CV belongs to another user",
        )

    db.delete(cv)
    db.commit()


@router.get("/mine", response_model=list[CVSummary])
def list_my_cvs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[CVSummary]:
    """List the current user's CVs, newest first."""
    rows = db.execute(
        select(
            CV.id,
            CV.filename,
            CV.uploaded_at,
            CV.parsed,
            func.coalesce(func.char_length(CV.raw_text), 0).label("character_count"),
        )
        .where(CV.user_id == current_user.id)
        .order_by(CV.uploaded_at.desc(), CV.id.desc())
    ).all()

    return [
        CVSummary(
            id=r.id,
            filename=r.filename,
            uploaded_at=r.uploaded_at,
            parsed=bool(r.parsed),
            character_count=int(r.character_count),
        )
        for r in rows
    ]
