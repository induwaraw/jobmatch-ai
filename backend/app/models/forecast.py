"""Predicted future demand per IT subcategory."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import MYSQL_TABLE_ARGS, Base


class Forecast(Base):
    __tablename__ = "forecasts"
    __table_args__ = (
        # Dashboard queries filter on subcategory and horizon together
        Index("ix_forecasts_subcategory_horizon", "subcategory", "horizon_months"),
        MYSQL_TABLE_ARGS,
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # One of the values listed in app.models.job.SUBCATEGORIES
    subcategory: Mapped[str] = mapped_column(String(60), nullable=False, index=True)

    # How far ahead the prediction looks, 6 or 12 months
    horizon_months: Mapped[int] = mapped_column(Integer, nullable=False)

    predicted_demand: Mapped[float] = mapped_column(Float, nullable=False)

    # Identifier of the model that produced the value, for traceability
    model_version: Mapped[str | None] = mapped_column(String(80), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    def __repr__(self) -> str:
        return (
            f"<Forecast id={self.id} subcategory={self.subcategory!r} "
            f"horizon_months={self.horizon_months}>"
        )
