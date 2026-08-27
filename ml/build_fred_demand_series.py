"""Build the monthly demand time series for the forecaster, from FRED.

The LinkedIn dataset turned out to be a two week scrape snapshot, so it has no
history to learn from. This uses FRED instead, which gives real monthly US
employment going back decades.

Each of the six subcategories is mapped to its OWN FRED series, so each has a
genuinely different trajectory. An earlier version split a single aggregate by
fixed shares, which made all six perfectly correlated and left nothing for a
forecaster to distinguish.

How a value is produced:

    demand(month, sub) = series_sub(month) / series_sub(first month)
                         * share(sub) * BASE_SCALE

Indexing to each series' own first month keeps its real shape while making the
six comparable in magnitude. The Sri Lankan share then sets the starting level,
so Software Engineering starts higher than UI/UX, matching our scraped mix.

Run from the project root with the ml venv:

    ml\\.venv\\Scripts\\python.exe ml\\build_fred_demand_series.py
"""

import argparse
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from dotenv import dotenv_values

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = PROJECT_ROOT / "ml" / ".env"
LABELS_CSV = PROJECT_ROOT / "data" / "job_labels.csv"
OUTPUT_CSV = PROJECT_ROOT / "ml" / "data" / "demand_timeseries.csv"

FRED_BASE = "https://api.stlouisfed.org/fred"
DEFAULT_START = "2015-01-01"

# Starting level for the highest share subcategory, purely so the numbers read
# sensibly. It scales everything equally and does not affect any shape.
BASE_SCALE = 1000.0

# Each subcategory gets its own series. "proxy" records how good the match
# actually is, because some of these are much closer than others and that
# belongs in the limitations, not buried in code.
SERIES_MAP = {
    "Software Engineering": {
        "series_id": "CES6054150001",
        "proxy": "strong",
        "why": "Computer Systems Design is the core software services industry",
    },
    "Data Science": {
        "series_id": "CES5051900001",
        "proxy": "weak",
        "why": "Web search portals and other information services is data adjacent, "
               "not data science specifically",
    },
    "Cyber Security": {
        "series_id": "CES6054160001",
        "proxy": "weak",
        "why": "Security consulting sits inside technical consulting, but so does "
               "much unrelated work",
    },
    "DevOps": {
        "series_id": "CES5051800001",
        "proxy": "strong",
        "why": "Computing infrastructure, data processing and web hosting is "
               "essentially the cloud infrastructure industry",
    },
    "QA": {
        "series_id": "CES5051100001",
        "proxy": "moderate",
        "why": "Publishing Industries includes software publishers, where much QA "
               "work sits",
    },
    "UI/UX": {
        "series_id": "SMU06000006054140001SA",
        "proxy": "moderate",
        "why": "Specialized Design Services, California only. No national monthly "
               "design series exists on FRED",
    },
}

SUBCATEGORIES = list(SERIES_MAP)


def read_api_key() -> str:
    key = (dotenv_values(ENV_FILE).get("FRED_API_KEY") or "").strip()
    if not key:
        raise SystemExit(
            f"FRED_API_KEY is empty in {ENV_FILE}. Paste your key after the = sign."
        )
    return key


def fetch_series(series_id: str, api_key: str, start: str) -> tuple[pd.Series, dict]:
    meta_response = requests.get(
        f"{FRED_BASE}/series",
        params={"series_id": series_id, "api_key": api_key, "file_type": "json"},
        timeout=30,
    )
    meta_response.raise_for_status()
    meta = meta_response.json()["seriess"][0]

    obs_response = requests.get(
        f"{FRED_BASE}/series/observations",
        params={
            "series_id": series_id,
            "api_key": api_key,
            "file_type": "json",
            "observation_start": start,
        },
        timeout=60,
    )
    obs_response.raise_for_status()
    rows = obs_response.json()["observations"]

    # FRED writes "." for a missing observation
    usable = [r for r in rows if r["value"] not in (".", "", None)]
    if not usable:
        raise SystemExit(f"series {series_id} returned no usable observations")

    values = pd.Series(
        [float(r["value"]) for r in usable],
        index=pd.to_datetime([r["date"] for r in usable]).strftime("%Y-%m"),
        name=series_id,
    )
    return values, meta


def subcategory_shares(labels_csv: Path) -> dict[str, float]:
    """Proportions from our own scraped and classified Sri Lankan jobs.

    Read from the label file, which holds the same 175 rows that were loaded
    into jobs.predicted_subcategory. Using the file rather than the database
    keeps the ml environment free of database drivers.
    """
    counts = Counter(pd.read_csv(labels_csv)["predicted_subcategory"])
    total = sum(counts.values())
    return {sub: counts.get(sub, 0) / total for sub in SUBCATEGORIES}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the FRED demand series.")
    parser.add_argument("--start", default=DEFAULT_START)
    parser.add_argument("--labels", type=Path, default=LABELS_CSV)
    parser.add_argument("--out", type=Path, default=OUTPUT_CSV)
    args = parser.parse_args(argv)

    if not args.labels.exists():
        parser.error(f"labels file not found: {args.labels}")

    api_key = read_api_key()
    shares = subcategory_shares(args.labels)

    line = "=" * 96
    print(line)
    print("ONE FRED SERIES PER SUBCATEGORY")
    print(line)
    print(f"  {'SUBCATEGORY':22} {'SERIES ID':24} {'FREQ':5} {'MONTHS':>7} {'PROXY':>9}")
    print("  " + "-" * 74)

    raw: dict[str, pd.Series] = {}
    meta_by_sub: dict[str, dict] = {}
    for sub, cfg in SERIES_MAP.items():
        values, meta = fetch_series(cfg["series_id"], api_key, args.start)
        raw[sub] = values
        meta_by_sub[sub] = meta
        print(f"  {sub:22} {cfg['series_id']:24} {meta['frequency_short']:5} "
              f"{len(values):>7} {cfg['proxy']:>9}")
        print(f"  {'':22} {meta['title'][:70]}")

    wide = pd.DataFrame(raw).dropna()
    months = list(wide.index)

    print()
    print(line)
    print("ALIGNED COVERAGE")
    print(line)
    print(f"  months common to all six : {len(months)}")
    print(f"  range                    : {months[0]} to {months[-1]}")
    years = sorted({m[:4] for m in months})
    print(f"  calendar years           : {years[0]} to {years[-1]} ({len(years)})")
    print(f"  missing cells            : {int(pd.DataFrame(raw).isna().sum().sum())}")

    # Index each series to its own first month, then set the level by share
    indexed = wide / wide.iloc[0]
    scaled = indexed.mul(pd.Series(shares)) * BASE_SCALE

    records = [
        {"year_month": month, "subcategory": sub, "demand": round(float(scaled.loc[month, sub]), 2)}
        for month in months
        for sub in SUBCATEGORIES
    ]
    series = pd.DataFrame(records)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    series.to_csv(args.out, index=False, encoding="utf-8")

    print()
    print(line)
    print("GROWTH, first month to last, from each series' own trajectory")
    print(line)
    print(f"  {'SUBCATEGORY':22} {'SHARE':>8} {'RAW FIRST':>11} {'RAW LAST':>11} "
          f"{'GROWTH':>9} {'DEMAND FIRST':>13} {'DEMAND LAST':>12}")
    print("  " + "-" * 92)
    for sub in SUBCATEGORIES:
        rf, rl = wide[sub].iloc[0], wide[sub].iloc[-1]
        df_, dl = scaled[sub].iloc[0], scaled[sub].iloc[-1]
        print(f"  {sub:22} {shares[sub]:>8.4f} {rf:>11,.1f} {rl:>11,.1f} "
              f"{(rl - rf) / rf:>+8.1%} {df_:>13,.2f} {dl:>12,.2f}")

    print()
    print(line)
    print("PAIRWISE CORRELATION  (was all 1.000 with the single series approach)")
    print(line)
    corr = scaled.corr()
    short = {s: s[:11] for s in SUBCATEGORIES}
    print(f"  {'':13}" + "".join(f"{short[c]:>13}" for c in corr.columns))
    for name, row in corr.iterrows():
        print(f"  {short[name]:13}" + "".join(f"{v:>13.3f}" for v in row))
    off = corr.values[~np.eye(len(corr), dtype=bool)]
    print()
    print(f"  off diagonal: min {off.min():.3f}, mean {off.mean():.3f}, max {off.max():.3f}")
    print(f"  all pairs exactly 1.000? {bool((corr.round(9) == 1.0).all().all())}")

    print()
    print(line)
    print("SAMPLE, first 3 and last 3 months")
    print(line)
    sample = pd.concat([scaled.head(3), scaled.tail(3)])
    print(f"  {'MONTH':10}" + "".join(f"{c[:12]:>13}" for c in SUBCATEGORIES))
    print("  " + "-" * 88)
    for month, row in sample.iterrows():
        print(f"  {month:10}" + "".join(f"{row[c]:>13,.2f}" for c in SUBCATEGORIES))

    print()
    print(line)
    print("PROXY QUALITY, be honest about this in the writeup")
    print(line)
    for sub, cfg in SERIES_MAP.items():
        print(f"  {sub:22} {cfg['proxy']:9} {cfg['why']}")

    print()
    print(f"written: {args.out}  ({len(series)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
