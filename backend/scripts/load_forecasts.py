"""Load the demand forecasts produced offline into the forecasts table.

Prophet is trained in the ML workspace, not here, so its output arrives as a
CSV. Rows are keyed on subcategory, horizon and model version, so re-running
this updates the existing rows rather than stacking duplicates.

Run from the backend folder:

    python scripts\\load_forecasts.py
    python scripts\\load_forecasts.py --csv ..\\data\\demand_forecasts.csv
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models.forecast import Forecast  # noqa: E402
from app.models.job import SUBCATEGORIES  # noqa: E402

DEFAULT_CSV = Path(__file__).resolve().parents[2] / "data" / "demand_forecasts.csv"
MODEL_VERSION = "prophet_v1"

REQUIRED_COLUMNS = {
    "subcategory",
    "horizon_months",
    "forecast_demand",
    "current_demand",
    "pct_change",
    "trend",
}
VALID_HORIZONS = {6, 12}


def to_float(value: str | None) -> float | None:
    value = (value or "").strip()
    if not value:
        return None
    return float(value)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Load demand forecasts.")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--model-version", default=MODEL_VERSION)
    args = parser.parse_args(argv)

    if not args.csv.exists():
        parser.error(f"forecasts file not found: {args.csv}")

    with args.csv.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))

    if not rows:
        parser.error("the forecasts file is empty")

    missing = REQUIRED_COLUMNS - set(rows[0].keys())
    if missing:
        parser.error(f"missing columns: {sorted(missing)}")

    print(f"reading {args.csv}")
    print(f"  rows in file  : {len(rows)}")
    print(f"  model version : {args.model_version}")

    db = SessionLocal()
    created = updated = 0
    problems: list[str] = []

    try:
        for row in rows:
            subcategory = (row["subcategory"] or "").strip()
            horizon = int(row["horizon_months"])

            if subcategory not in SUBCATEGORIES:
                problems.append(f"unknown subcategory {subcategory!r}")
                continue
            if horizon not in VALID_HORIZONS:
                problems.append(f"unexpected horizon {horizon} for {subcategory}")
                continue

            existing = db.scalar(
                select(Forecast).where(
                    Forecast.subcategory == subcategory,
                    Forecast.horizon_months == horizon,
                    Forecast.model_version == args.model_version,
                )
            )
            if existing is None:
                forecast = Forecast(
                    subcategory=subcategory,
                    horizon_months=horizon,
                    model_version=args.model_version,
                )
                db.add(forecast)
                created += 1
            else:
                forecast = existing
                updated += 1

            forecast.predicted_demand = to_float(row["forecast_demand"])
            forecast.current_demand = to_float(row["current_demand"])
            forecast.pct_change = to_float(row["pct_change"])
            forecast.trend = (row["trend"] or "").strip() or None

        db.commit()

        print(f"  rows created  : {created}")
        print(f"  rows updated  : {updated}")
        print(f"  rows skipped  : {len(problems)}")
        for message in problems:
            print(f"     - {message}")

        total = db.scalar(
            select(Forecast).where(Forecast.model_version == args.model_version)
        )
        stored = db.scalars(
            select(Forecast)
            .where(Forecast.model_version == args.model_version)
            .order_by(Forecast.subcategory, Forecast.horizon_months)
        ).all()

        print(f"\nrows now in forecasts for {args.model_version}: {len(stored)}")
        print()
        header = (
            f"  {'SUBCATEGORY':22} {'HORIZON':>7} {'CURRENT':>9} "
            f"{'PREDICTED':>10} {'PCT':>7}  {'TREND':10} {'CREATED':19}"
        )
        print(header)
        print("  " + "-" * (len(header) - 2))
        for f in stored:
            print(
                f"  {f.subcategory:22} {f.horizon_months:>7} "
                f"{f.current_demand:>9,.2f} {f.predicted_demand:>10,.2f} "
                f"{f.pct_change:>6.1f}%  {str(f.trend):10} {str(f.created_at):19}"
            )
    finally:
        db.close()

    return 0 if not problems else 1


if __name__ == "__main__":
    raise SystemExit(main())
