"""One off seeding for a fresh deployment database.

Brings an empty database up to the state the demo needs, in order:

  1. alembic upgrade head, to create the schema
  2. the skills taxonomy, so the skills table is populated
  3. the employers and jobs, copied from a source database
  4. the demand forecasts, read from the CSV Prophet produced
  5. an admin account and one ordinary account

Every step is safe to run twice. Rows that already exist are left alone rather
than duplicated, so a partial run can simply be repeated.

The target is whatever DATABASE_URL points at, which is how "railway run" is
meant to be used: it injects the deployment's variables into a command running
on this machine. The source for the scraped jobs is the local database, read
from backend/.env directly rather than from the environment, precisely because
the environment has been taken over by the target.

Usage, from the backend folder:

    railway run python scripts/seed_deployment.py
    railway run python scripts/seed_deployment.py --admin-password "..."
    python scripts/seed_deployment.py --target-url mysql://...   (without the CLI)
"""

import argparse
import csv
import json
import os
import secrets
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import create_engine, func, insert, select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.models.employer import Employer  # noqa: E402
from app.models.forecast import Forecast  # noqa: E402
from app.models.job import SUBCATEGORIES, Job  # noqa: E402
from app.models.skill import Skill  # noqa: E402
from app.models.user import User  # noqa: E402

TAXONOMY = REPO_ROOT / "ml" / "skills" / "skills_taxonomy.json"
FORECASTS_CSV = REPO_ROOT / "data" / "demand_forecasts.csv"
MODEL_VERSION = "prophet_v1"
VALID_HORIZONS = {6, 12}

DEFAULT_ADMIN_EMAIL = "weerarathnainduwara@gmail.com"
DEFAULT_ADMIN_NAME = "Induwara Weerarathna"
DEFAULT_USER_EMAIL = "demo@jobmatch.lk"
DEFAULT_USER_NAME = "Demo User"

RULE = "=" * 74


def banner(step: str, title: str) -> None:
    print()
    print(RULE)
    print(f"STEP {step}: {title}")
    print(RULE)


def normalise(url: str) -> str:
    """Accept the plain mysql:// form managed providers hand out."""
    url = (url or "").strip()
    if url.startswith("mysql://"):
        url = f"mysql+pymysql://{url[len('mysql://'):]}"
    return url


def read_env_file(key: str) -> str:
    """Pull one value straight out of backend/.env.

    Deliberately not os.environ. Under "railway run" the environment holds the
    deployment's values, and this is how the local database stays reachable as
    the source to copy from.
    """
    env_file = BACKEND_DIR / ".env"
    if not env_file.exists():
        return ""
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith(f"{key}=") and not line.startswith("#"):
            return line.split("=", 1)[1].strip()
    return ""


def redact(url: str) -> str:
    """Hide the password so the connection string is safe to print."""
    if "@" not in url or "://" not in url:
        return url
    scheme, rest = url.split("://", 1)
    _, host = rest.rsplit("@", 1)
    return f"{scheme}://***:***@{host}"


# ---------------------------------------------------------------------------
# Step 1: schema
# ---------------------------------------------------------------------------
def run_migrations(target_url: str) -> None:
    banner("1", "alembic upgrade head")
    env = dict(os.environ)
    env["DATABASE_URL"] = target_url
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )
    output = (result.stdout + result.stderr).strip()
    for line in output.splitlines():
        print(f"  {line}")
    if result.returncode != 0:
        raise SystemExit("\nalembic failed, stopping before any data was written")
    print("  schema is at head")


# ---------------------------------------------------------------------------
# Step 2: skills taxonomy
# ---------------------------------------------------------------------------
def seed_skills(session: Session) -> None:
    banner("2", "skills taxonomy")
    if not TAXONOMY.exists():
        print(f"  taxonomy not found at {TAXONOMY}, skipping")
        return

    entries = json.loads(TAXONOMY.read_text(encoding="utf-8"))["skills"]
    existing = {name for name in session.scalars(select(Skill.name))}

    created = 0
    for entry in entries:
        name = (entry.get("name") or "").strip()
        if not name or name in existing:
            continue
        subcategories = entry.get("subcategories") or []
        session.add(
            Skill(
                name=name,
                category=subcategories[0] if subcategories else None,
                source="taxonomy",
            )
        )
        existing.add(name)
        created += 1

    session.commit()
    print(f"  in file       : {len(entries)}")
    print(f"  created       : {created}")
    print(f"  already there : {len(entries) - created}")


# ---------------------------------------------------------------------------
# Step 3: employers and jobs, copied from the source database
# ---------------------------------------------------------------------------
def copy_table(source: Session, target: Session, model, label: str) -> None:
    """Copy rows the target does not already hold, keeping primary keys.

    The ids are preserved because jobs reference employers by id. Copying with
    fresh ids would need a mapping table for no benefit.
    """
    table = model.__table__
    source_rows = source.execute(select(table)).mappings().all()
    if not source_rows:
        print(f"  {label}: nothing in the source")
        return

    present = set(target.scalars(select(table.c.id)))
    fresh = [dict(row) for row in source_rows if row["id"] not in present]

    if fresh:
        # Chunked so a large description column does not build one huge packet
        for start in range(0, len(fresh), 200):
            target.execute(insert(table), fresh[start : start + 200])
        target.commit()

    print(f"  {label}: {len(source_rows)} in source, {len(fresh)} copied, "
          f"{len(source_rows) - len(fresh)} already there")


def seed_jobs(source_url: str, target: Session) -> None:
    banner("3", "employers and jobs")
    if not source_url:
        print("  no source database configured, skipping")
        print("  pass --source-url, or leave DATABASE_URL in backend/.env")
        return

    print(f"  source: {redact(source_url)}")
    try:
        source_engine = create_engine(source_url, pool_pre_ping=True, future=True)
        with Session(source_engine) as source:
            # Employers first, jobs reference them
            copy_table(source, target, Employer, "employers")
            copy_table(source, target, Job, "jobs")
    except Exception as exc:
        print(f"  could not read the source database: {exc}")
        print("  the deployment will have no vacancies until this is rerun")


# ---------------------------------------------------------------------------
# Step 4: forecasts
# ---------------------------------------------------------------------------
def seed_forecasts(session: Session, csv_path: Path) -> None:
    banner("4", "demand forecasts")
    if not csv_path.exists():
        print(f"  forecasts CSV not found at {csv_path}, skipping")
        return

    with csv_path.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))

    created = updated = skipped = 0
    for row in rows:
        subcategory = (row.get("subcategory") or "").strip()
        try:
            horizon = int(row.get("horizon_months", 0))
        except ValueError:
            skipped += 1
            continue
        if subcategory not in SUBCATEGORIES or horizon not in VALID_HORIZONS:
            skipped += 1
            continue

        forecast = session.scalar(
            select(Forecast).where(
                Forecast.subcategory == subcategory,
                Forecast.horizon_months == horizon,
                Forecast.model_version == MODEL_VERSION,
            )
        )
        if forecast is None:
            forecast = Forecast(
                subcategory=subcategory,
                horizon_months=horizon,
                model_version=MODEL_VERSION,
            )
            session.add(forecast)
            created += 1
        else:
            updated += 1

        def number(key: str) -> float | None:
            value = (row.get(key) or "").strip()
            return float(value) if value else None

        forecast.predicted_demand = number("forecast_demand")
        forecast.current_demand = number("current_demand")
        forecast.pct_change = number("pct_change")
        forecast.trend = (row.get("trend") or "").strip() or None

    session.commit()
    print(f"  rows in file  : {len(rows)}")
    print(f"  created       : {created}")
    print(f"  updated       : {updated}")
    print(f"  skipped       : {skipped}")


# ---------------------------------------------------------------------------
# Step 5: accounts
# ---------------------------------------------------------------------------
def ensure_user(
    session: Session, email: str, name: str, role: str, password: str
) -> tuple[str, bool]:
    existing = session.scalar(select(User).where(User.email == email))
    if existing is not None:
        # Never silently reset a password on an account that already exists
        if existing.role != role:
            existing.role = role
            session.commit()
        return email, False

    session.add(
        User(
            email=email,
            full_name=name,
            password_hash=hash_password(password),
            role=role,
            is_active=True,
        )
    )
    session.commit()
    return email, True


def seed_accounts(session: Session, args) -> list[tuple[str, str, str, bool]]:
    banner("5", "accounts")
    made: list[tuple[str, str, str, bool]] = []

    for email, name, role, password in (
        (args.admin_email, args.admin_name, "admin", args.admin_password),
        (args.user_email, args.user_name, "user", args.user_password),
    ):
        _, created = ensure_user(session, email, name, role, password)
        made.append((email, role, password, created))
        state = "created" if created else "already existed, left untouched"
        print(f"  {role:5}  {email:34} {state}")

    return made


# ---------------------------------------------------------------------------
# Final counts
# ---------------------------------------------------------------------------
def report_counts(session: Session) -> None:
    banner("6", "row counts")
    counts = {
        "jobs": Job,
        "skills": Skill,
        "forecasts": Forecast,
        "users": User,
        "employers": Employer,
    }
    for label, model in counts.items():
        total = session.scalar(select(func.count()).select_from(model.__table__))
        print(f"  {label:12} {total:>8,}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed a deployment database.")
    parser.add_argument(
        "--target-url",
        default=os.environ.get("DATABASE_URL", ""),
        help="database to seed, defaults to DATABASE_URL from the environment",
    )
    parser.add_argument(
        "--source-url",
        default="",
        help="database to copy jobs from, defaults to DATABASE_URL in backend/.env",
    )
    parser.add_argument("--forecasts-csv", type=Path, default=FORECASTS_CSV)
    parser.add_argument("--admin-email", default=DEFAULT_ADMIN_EMAIL)
    parser.add_argument("--admin-name", default=DEFAULT_ADMIN_NAME)
    parser.add_argument("--admin-password", default=os.environ.get("ADMIN_PASSWORD", ""))
    parser.add_argument("--user-email", default=DEFAULT_USER_EMAIL)
    parser.add_argument("--user-name", default=DEFAULT_USER_NAME)
    parser.add_argument("--user-password", default=os.environ.get("TEST_USER_PASSWORD", ""))
    parser.add_argument(
        "--skip-jobs", action="store_true", help="do not copy employers and jobs"
    )
    args = parser.parse_args(argv)

    target_url = normalise(args.target_url)
    if not target_url:
        parser.error(
            "no target database. Run under 'railway run' so DATABASE_URL is set, "
            "or pass --target-url."
        )

    source_url = normalise(args.source_url or read_env_file("DATABASE_URL"))
    if source_url == target_url:
        source_url = ""

    # Passwords are generated rather than defaulted to something guessable, and
    # printed once at the end so they can be saved.
    generated: set[str] = set()
    if not args.admin_password:
        args.admin_password = secrets.token_urlsafe(12)
        generated.add(args.admin_email)
    if not args.user_password:
        args.user_password = secrets.token_urlsafe(12)
        generated.add(args.user_email)

    print(RULE)
    print("SEEDING A DEPLOYMENT DATABASE")
    print(RULE)
    print(f"  target : {redact(target_url)}")
    print(f"  source : {redact(source_url) if source_url else 'none, jobs will be skipped'}")

    run_migrations(target_url)

    engine = create_engine(target_url, pool_pre_ping=True, pool_recycle=280, future=True)
    with Session(engine) as session:
        seed_skills(session)
        if args.skip_jobs:
            banner("3", "employers and jobs")
            print("  skipped at your request")
        else:
            seed_jobs(source_url, session)
        seed_forecasts(session, args.forecasts_csv)
        accounts = seed_accounts(session, args)
        report_counts(session)

    print()
    print(RULE)
    print("SIGN IN DETAILS")
    print(RULE)
    for email, role, password, created in accounts:
        if created and email in generated:
            print(f"  {role:5}  {email:34} {password}")
        elif created:
            print(f"  {role:5}  {email:34} (the password you supplied)")
        else:
            print(f"  {role:5}  {email:34} (unchanged, account already existed)")
    if generated:
        print()
        print("  Generated passwords are shown once. Save them now.")

    print()
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
