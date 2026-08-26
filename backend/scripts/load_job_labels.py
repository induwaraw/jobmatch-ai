"""Load offline classifier predictions into the jobs table.

The classifier runs in Colab, not here, so its output arrives as a CSV of
id, predicted_subcategory, confidence. This writes those onto the matching
job rows, leaving the scraped subcategory column untouched.

Run from the backend folder:

    python scripts\\load_job_labels.py
    python scripts\\load_job_labels.py --csv ..\\data\\job_labels.csv
"""

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

# Make "app" importable when this is run directly from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models.job import SUBCATEGORIES, Job  # noqa: E402

DEFAULT_CSV = Path(__file__).resolve().parents[2] / "data" / "job_labels.csv"

REQUIRED_COLUMNS = {"id", "predicted_subcategory", "confidence"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Load job classifier labels.")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    args = parser.parse_args(argv)

    if not args.csv.exists():
        parser.error(f"labels file not found: {args.csv}")

    with args.csv.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))

    if not rows:
        parser.error("the labels file is empty")

    missing_cols = REQUIRED_COLUMNS - set(rows[0].keys())
    if missing_cols:
        parser.error(f"missing columns in the labels file: {sorted(missing_cols)}")

    print(f"reading {args.csv}")
    print(f"  rows in file: {len(rows)}")

    db = SessionLocal()
    updated = 0
    not_found: list[str] = []
    bad_label: list[str] = []

    try:
        for row in rows:
            job_id = int(row["id"])
            label = (row["predicted_subcategory"] or "").strip()
            confidence = float(row["confidence"]) if row["confidence"] else None

            if label not in SUBCATEGORIES:
                bad_label.append(f"id {job_id}: {label!r}")
                continue

            job = db.get(Job, job_id)
            if job is None:
                not_found.append(str(job_id))
                continue

            job.predicted_subcategory = label
            job.classifier_confidence = confidence
            updated += 1

        db.commit()

        print(f"  rows updated: {updated}")
        print(f"  ids not matching any job: {len(not_found)}"
              f"{' -> ' + ', '.join(not_found) if not_found else ''}")
        print(f"  rows with an unknown label: {len(bad_label)}"
              f"{' -> ' + ', '.join(bad_label) if bad_label else ''}")

        print("\njobs per predicted_subcategory:")
        counts = db.execute(
            select(Job.predicted_subcategory, func.count())
            .where(Job.predicted_subcategory.isnot(None))
            .group_by(Job.predicted_subcategory)
            .order_by(func.count().desc())
        ).all()
        total = sum(n for _, n in counts)
        for name, n in counts:
            print(f"   {name:24} {n}")
        print(f"   {'TOTAL':24} {total}")

        unlabelled = db.scalar(
            select(func.count())
            .select_from(Job)
            .where(Job.predicted_subcategory.is_(None))
        )
        print(f"\njobs still without a prediction: {unlabelled} "
              f"(the TopJobs placeholder rows)")
    finally:
        db.close()

    return 0 if not not_found and not bad_label else 1


if __name__ == "__main__":
    raise SystemExit(main())
