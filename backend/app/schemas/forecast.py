"""Schemas for the forecasts endpoint."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ForecastOut(BaseModel):
    """One forecast, for a single subcategory at a single horizon."""

    id: int
    subcategory: str
    horizon_months: int
    current_demand: float | None
    predicted_demand: float
    pct_change: float | None
    trend: str | None
    model_version: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubcategoryForecast(BaseModel):
    """All horizons for one subcategory, which is how the dashboard reads it."""

    subcategory: str
    current_demand: float | None
    horizons: list[ForecastOut]


class ForecastsResponse(BaseModel):
    """What GET /api/forecasts returns."""

    model_version: str | None
    generated_at: datetime | None
    subcategory_count: int
    forecast_count: int
    subcategories: list[SubcategoryForecast]
