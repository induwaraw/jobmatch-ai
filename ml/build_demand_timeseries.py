"""Count LinkedIn IT postings per month per subcategory.

This was the first attempt at a demand series. It is kept because its result
is a finding worth recording: the Kaggle LinkedIn dataset is a two week scrape
snapshot from April 2024, so every posting lands in a single month and there is
no history to forecast from. The real series is built by
build_fred_demand_series.py instead.

The IT filter and the six-subcategory labelling rules are imported from
prepare_classifier_data so there is one definition of both, not two that can
drift apart.

Run from the project root with the ml venv:

    ml\\.venv\\Scripts\\python.exe ml\\build_demand_timeseries.py
"""

import argparse
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from prepare_classifier_data import (  # noqa: E402
    IT_RE,
    NOT_IT_RE,
    SUBCATEGORIES,
    label_title,
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
POSTINGS_CSV = PROJECT_ROOT / "data" / "kaggle_linkedin" / "postings.csv"
# Deliberately not demand_timeseries.csv, so this cannot overwrite the real
# series built from FRED
OUTPUT_CSV = PROJECT_ROOT / "ml" / "data" / "linkedin_monthly_counts.csv"


def load_postings(path: Path) -> pd.DataFrame:
    df = pd.read_csv(
        path,
        usecols=["job_id", "title", "listed_time", "original_listed_time"],
        low_memory=False,
    )
    df["title"] = df["title"].fillna("").astype(str)
    return df


def add_year_month(df: pd.DataFrame) -> pd.DataFrame:
    """Turn the epoch millisecond columns into a YYYY-MM string."""
    # listed_time is the primary date, original_listed_time is the fallback
    epoch_ms = df["listed_time"].where(df["listed_time"].notna(), df["original_listed_time"])
    posted = pd.to_datetime(epoch_ms, unit="ms", errors="coerce")
    df = df.assign(posted_at=posted)
    df["year_month"] = df["posted_at"].dt.strftime("%Y-%m")
    return df


def build(path: Path) -> tuple[pd.DataFrame, dict]:
    stats: dict = {}

    df = load_postings(path)
    stats["postings_total"] = len(df)

    is_it = df["title"].str.contains(IT_RE, regex=True) & ~df["title"].str.contains(
        NOT_IT_RE, regex=True
    )
    it = df[is_it].copy()
    stats["it_postings"] = len(it)

    it["subcategory"] = it["title"].map(label_title)
    stats["unmapped_dropped"] = int(it["subcategory"].isna().sum())

    mapped = it[it["subcategory"].notna()].copy()
    stats["mapped"] = len(mapped)

    mapped = add_year_month(mapped)
    stats["missing_date"] = int(mapped["year_month"].isna().sum())
    mapped = mapped[mapped["year_month"].notna()]
    stats["dated"] = len(mapped)

    series = (
        mapped.groupby(["year_month", "subcategory"])
        .size()
        .reset_index(name="job_count")
        .sort_values(["year_month", "subcategory"])
        .reset_index(drop=True)
    )
    return series, stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the monthly demand series.")
    parser.add_argument("--postings", type=Path, default=POSTINGS_CSV)
    parser.add_argument("--out", type=Path, default=OUTPUT_CSV)
    args = parser.parse_args(argv)

    if not args.postings.exists():
        parser.error(f"postings file not found: {args.postings}")

    print(f"reading {args.postings}")
    series, stats = build(args.postings)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    series.to_csv(args.out, index=False, encoding="utf-8")

    line = "=" * 76
    print()
    print(line)
    print("PIPELINE")
    print(line)
    print(f"  postings in file        : {stats['postings_total']:,}")
    print(f"  IT postings             : {stats['it_postings']:,}")
    print(f"  unmapped, dropped       : {stats['unmapped_dropped']:,}")
    print(f"  mapped to six classes   : {stats['mapped']:,}")
    print(f"  without a usable date   : {stats['missing_date']:,}")
    print(f"  counted in the series   : {stats['dated']:,}")

    months = sorted(series["year_month"].unique())
    print()
    print(line)
    print("DATE COVERAGE")
    print(line)
    print(f"  earliest month : {months[0]}")
    print(f"  latest month   : {months[-1]}")
    print(f"  distinct months: {len(months)}")
    print(f"  months present : {', '.join(months)}")

    print()
    print(line)
    print("MONTHLY COUNTS, months as rows")
    print(line)
    pivot = (
        series.pivot(index="year_month", columns="subcategory", values="job_count")
        .reindex(columns=SUBCATEGORIES)
        .fillna(0)
        .astype(int)
    )
    pivot["TOTAL"] = pivot.sum(axis=1)
    header = f"  {'MONTH':10}" + "".join(f"{c[:13]:>15}" for c in pivot.columns)
    print(header)
    print("  " + "-" * (len(header) - 2))
    for month, row in pivot.iterrows():
        print(f"  {month:10}" + "".join(f"{int(v):>15,}" for v in row))
    print("  " + "-" * (len(header) - 2))
    print(f"  {'TOTAL':10}" + "".join(f"{int(v):>15,}" for v in pivot.sum()))

    print()
    print(line)
    print("MONTHS OF DATA PER SUBCATEGORY  (this decides whether an LSTM is viable)")
    print(line)
    print(f"  {'SUBCATEGORY':24} {'MONTHS':>7} {'TOTAL':>9} {'MIN/MONTH':>10} {'MAX/MONTH':>10}")
    print("  " + "-" * 64)
    for sub in SUBCATEGORIES:
        rows = series[series["subcategory"] == sub]
        n_months = rows["year_month"].nunique()
        print(f"  {sub:24} {n_months:>7} {int(rows['job_count'].sum()):>9,} "
              f"{int(rows['job_count'].min()):>10,} {int(rows['job_count'].max()):>10,}")

    print()
    print(line)
    print("CONCENTRATION")
    print(line)
    by_month = series.groupby("year_month")["job_count"].sum().sort_values(ascending=False)
    total = int(by_month.sum())
    running = 0
    for month, count in by_month.items():
        running += count
        print(f"  {month}  {int(count):>7,}  {count / total:6.1%}   cumulative {running / total:6.1%}")

    print()
    print(f"written: {args.out}  ({len(series)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
