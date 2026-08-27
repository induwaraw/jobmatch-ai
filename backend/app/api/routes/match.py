"""CV to job matching endpoint."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.cv import CV
from app.models.user import User
from app.schemas.match import JobMatchOut, MatchResponse
from app.services.matcher import DEFAULT_TOP_N, match_cv_to_jobs

router = APIRouter(prefix="/api/match", tags=["match"])


@router.get("/{cv_id}", response_model=MatchResponse)
def match_cv(
    cv_id: int,
    top_n: int = Query(DEFAULT_TOP_N, ge=1, le=100, description="How many jobs to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MatchResponse:
    """Rank the open jobs against one of the current user's CVs."""
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
    if not (cv.raw_text or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This CV has no extracted text to match on",
        )

    result = match_cv_to_jobs(db, cv, top_n=top_n)

    return MatchResponse(
        cv_id=result.cv_id,
        cv_subcategory=result.cv_subcategory,
        cv_subcategory_confidence=result.cv_subcategory_confidence,
        classifier_mode=result.classifier_mode,
        cv_skill_count=result.cv_skill_count,
        cv_skills=result.cv_skills,
        jobs_considered=result.jobs_considered,
        jobs_excluded_closed=result.jobs_excluded_closed,
        jobs_skipped_no_skills=result.jobs_skipped_no_skills,
        returned=len(result.matches),
        matches=[JobMatchOut(**vars(m)) for m in result.matches],
    )
