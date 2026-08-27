"""Job market demand forecasts.

These are public. The other read endpoints are behind a token because they
return a specific user's data, but forecasts are aggregate market figures with
nothing personal in them, and the dashboard shows them to visitors.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.forecast import Forecast
from app.schemas.forecast import ForecastOut, ForecastsResponse, SubcategoryForecast

router = APIRouter(prefix="/api/forecasts", tags=["forecasts"])

DEFAULT_MODEL_VERSION = "prophet_v1"


@router.get("", response_model=ForecastsResponse)
def list_forecasts(
    model_version: str | None = Query(
        None, description="Defaults to the newest model version present"
    ),
    subcategory: str | None = Query(None, description="Filter to one subcategory"),
    db: Session = Depends(get_db),
) -> ForecastsResponse:
    """Return the demand forecasts, grouped by subcategory."""
    # Without an explicit version, use whichever model produced the most
    # recent rows, so the dashboard never mixes two model runs together.
    if model_version is None:
        model_version = db.scalar(
            select(Forecast.model_version).order_by(Forecast.created_at.desc()).limit(1)
        )

    stmt = select(Forecast).where(Forecast.model_version == model_version)
    if subcategory:
        stmt = stmt.where(Forecast.subcategory == subcategory)

    rows = list(
        db.scalars(stmt.order_by(Forecast.subcategory, Forecast.horizon_months)).all()
    )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No forecasts available",
        )

    grouped: dict[str, list[Forecast]] = {}
    for row in rows:
        grouped.setdefault(row.subcategory, []).append(row)

    subcategories = [
        SubcategoryForecast(
            subcategory=name,
            # The starting point is the same across horizons, so report it once
            current_demand=items[0].current_demand,
            horizons=[ForecastOut.model_validate(item) for item in items],
        )
        for name, items in sorted(grouped.items())
    ]

    return ForecastsResponse(
        model_version=model_version,
        generated_at=max(row.created_at for row in rows),
        subcategory_count=len(subcategories),
        forecast_count=len(rows),
        subcategories=subcategories,
    )
