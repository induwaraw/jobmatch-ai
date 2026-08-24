"""Scraper for TopJobs, our secondary source.

TopJobs is only used for vacancy volume, which feeds the demand forecasting.
The full adverts on TopJobs are uploaded images, so there is no description
text to collect. This scraper reads the category listing pages and nothing
else, no detail pages.

Run it from the backend folder:

    python -m app.scrapers.topjobs --categories SDQ
    python -m app.scrapers.topjobs --categories SDQ,HNS

scrape() is the entry point to call later from a scheduled task.
"""

import argparse
import logging
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.job import Job
from app.scrapers.common import (
    build_session,
    is_job_active,
    refresh_active_flags,
    upsert_employer,
)

logger = logging.getLogger(__name__)

SITE_URL = "https://www.topjobs.lk"
LISTING_URL = SITE_URL + "/applicant/vacancybyfunctionalarea.jsp?FA={code}"

SOURCE = "topjobs"

# TopJobs also has an IT-Telecoms category (ITT). It is left out because
# Telecoms is not one of the six subcategories this project uses, the same
# decision taken for XpressJobs sector 50.
CATEGORY_SUBCATEGORY = {
    "SDQ": "Software Engineering",
    "HNS": "DevOps",
}

CATEGORY_NAMES = {
    "SDQ": "IT-Software/DB/QA/Web/Graphics/GIS",
    "HNS": "IT-Hardware/Networks/Systems",
}

# TopJobs adverts are images, so we store this rather than inventing text
NO_DESCRIPTION = (
    "Description not available (TopJobs listings are image-based); "
    "this record is used for vacancy-volume forecasting only."
)

REQUEST_DELAY = 1.5
REQUEST_TIMEOUT = 40

# Dates on the listing look like "Mon Aug 24 2026"
DATE_FORMAT = "%a %b %d %Y"
DATE_PATTERN = re.compile(r"^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$")

JSESSIONID_PATTERN = re.compile(r";jsessionid=[^?&/]*", re.I)


@dataclass
class ScrapeStats:
    category: str
    subcategory: str
    rows_on_page: int = 0
    parsed: int = 0
    skipped: int = 0
    jobs_created: int = 0
    jobs_updated: int = 0
    employers_created: int = 0
    errors: list[str] = field(default_factory=list)


def strip_jsessionid(url: str) -> str:
    return JSESSIONID_PATTERN.sub("", url)


def parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    text = " ".join(value.split())
    if not DATE_PATTERN.match(text):
        return None
    try:
        return datetime.strptime(text, DATE_FORMAT)
    except ValueError:
        return None


def build_job_url(row_onclick: str | None) -> str | None:
    """Build the advert link from the ids in the row's onclick handler."""
    if not row_onclick:
        return None
    match = re.search(
        r"createAlert\('(\d+)','([^']*)','([^']*)','([^']*)'", row_onclick
    )
    if not match:
        return None
    rid, agent_code, job_code, employer_code = match.groups()
    return strip_jsessionid(
        f"{SITE_URL}/employer/JobAdvertismentServlet"
        f"?rid={rid}&ac={agent_code}&jc={job_code}&ec={employer_code}"
        f"&pg=applicant/vacancybyfunctionalarea.jsp"
    )


def cell_text(cell) -> str:
    return " ".join(cell.get_text(" ", strip=True).split())


def parse_row(row) -> dict | None:
    """Pull one job out of a listing row, or None if the row is not a job.

    The markup puts the job title in an h2 and the employer in an h1, which is
    the wrong way round from what the tags suggest.
    """
    cells = row.find_all("td", recursive=False)
    if len(cells) < 6:
        return None

    heading_title = row.find("h2")
    heading_employer = row.find("h1")
    if heading_title is None:
        return None

    title = " ".join(heading_title.get_text(" ", strip=True).split())
    employer = (
        " ".join(heading_employer.get_text(" ", strip=True).split())
        if heading_employer
        else ""
    )
    if not title:
        return None

    # Reference number sits in its own cell. Fall back to the hidden job code.
    reference = ""
    for cell in cells[:3]:
        text = cell_text(cell)
        if text.isdigit() and len(text) >= 6:
            reference = text
            break
    if not reference:
        hidden = row.find(
            "span", id=lambda v: bool(v) and v.startswith("hdnJC")
        )
        if hidden:
            reference = hidden.get_text(strip=True).lstrip("0")
    if not reference:
        return None

    # Pick the dates out by shape rather than by fixed position
    dates = [d for d in (parse_date(cell_text(c)) for c in cells) if d]
    opening_date = dates[0] if dates else None
    closing_date = dates[1] if len(dates) > 1 else None

    location = cell_text(cells[-1]) or None

    return {
        "reference": reference,
        "title": title,
        "employer": employer,
        "opening_date": opening_date,
        "closing_date": closing_date,
        "location": location,
        "url": build_job_url(row.get("onclick")),
    }


def fetch_category(session: requests.Session, code: str) -> str:
    url = LISTING_URL.format(code=code)
    response = session.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    time.sleep(REQUEST_DELAY)
    return response.text


def upsert_job(db: Session, parsed: dict, subcategory: str, stats: ScrapeStats) -> None:
    source_job_id = parsed["reference"]
    now = datetime.now()
    closing_date = parsed["closing_date"]

    employer, created = upsert_employer(db, parsed["employer"])
    if created:
        stats.employers_created += 1

    existing = db.scalar(
        select(Job).where(Job.source == SOURCE, Job.source_job_id == source_job_id)
    )

    if existing is None:
        job = Job(source=SOURCE, source_job_id=source_job_id)
        job.first_seen = now
        db.add(job)
        stats.jobs_created += 1
    else:
        job = existing
        stats.jobs_updated += 1

    job.title = parsed["title"][:255]
    job.description = NO_DESCRIPTION
    job.subcategory = subcategory
    job.location = parsed["location"][:150] if parsed["location"] else None
    job.url = (parsed["url"] or "")[:500] or None
    job.employer = employer
    job.scraped_at = now
    job.last_seen = now
    job.expiry_date = closing_date
    job.is_active = is_job_active(closing_date)


def scrape_category(
    code: str, db: Session, session: requests.Session, limit: int | None = None
) -> ScrapeStats:
    subcategory = CATEGORY_SUBCATEGORY.get(code)
    if subcategory is None:
        raise ValueError(
            f"category {code!r} has no subcategory mapping, "
            f"known categories are {sorted(CATEGORY_SUBCATEGORY)}"
        )

    stats = ScrapeStats(category=code, subcategory=subcategory)
    logger.info(
        "Category %s (%s) -> subcategory %r",
        code,
        CATEGORY_NAMES.get(code, "?"),
        subcategory,
    )

    html = fetch_category(session, code)
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select('tr[id^="tr"]')
    stats.rows_on_page = len(rows)
    logger.info("Found %d listing rows", len(rows))

    records = []
    for row in rows:
        try:
            parsed = parse_row(row)
        except Exception as exc:
            stats.skipped += 1
            stats.errors.append(f"row {row.get('id')}: {exc}")
            continue
        if parsed is None:
            stats.skipped += 1
            continue
        records.append(parsed)

    stats.parsed = len(records)
    logger.info("Parsed %d jobs, skipped %d rows", stats.parsed, stats.skipped)

    if limit is not None:
        records = records[:limit]
        logger.info("Limit set, only storing %d jobs", len(records))

    # The same reference can appear twice on a page, keep the first
    seen: set[str] = set()
    for record in records:
        if record["reference"] in seen:
            continue
        seen.add(record["reference"])
        upsert_job(db, record, subcategory, stats)

    db.commit()
    logger.info(
        "Stored: %d created, %d updated, %d new employers",
        stats.jobs_created,
        stats.jobs_updated,
        stats.employers_created,
    )
    return stats


def scrape(categories: list[str] | None = None, limit: int | None = None) -> list[ScrapeStats]:
    """Scrape the given categories. This is the function to call on a schedule."""
    categories = categories or list(CATEGORY_SUBCATEGORY)
    session = build_session(accept="text/html,application/xhtml+xml,*/*;q=0.8")
    results: list[ScrapeStats] = []

    db = SessionLocal()
    try:
        for code in categories:
            results.append(scrape_category(code, db, session, limit=limit))

        active, expired = refresh_active_flags(db, SOURCE)
        logger.info("Active flags refreshed: %d active, %d expired", active, expired)
    finally:
        db.close()
        session.close()

    return results


def _parse_categories(value: str) -> list[str]:
    return [part.strip().upper() for part in value.split(",") if part.strip()]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scrape IT vacancy volume from TopJobs.")
    parser.add_argument(
        "--categories",
        type=_parse_categories,
        default=list(CATEGORY_SUBCATEGORY),
        help="Comma separated category codes, for example SDQ or SDQ,HNS",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only store this many jobs per category, useful for a quick test",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )

    unknown = [c for c in args.categories if c not in CATEGORY_SUBCATEGORY]
    if unknown:
        parser.error(
            f"unknown category codes {unknown}, "
            f"known codes are {sorted(CATEGORY_SUBCATEGORY)}"
        )

    started = time.time()
    results = scrape(categories=args.categories, limit=args.limit)
    elapsed = time.time() - started

    print()
    print("=" * 68)
    print("SUMMARY")
    print("=" * 68)
    for stats in results:
        print(f"Category {stats.category} -> {stats.subcategory}")
        print(f"   rows on page   : {stats.rows_on_page}")
        print(f"   jobs parsed    : {stats.parsed}  (skipped {stats.skipped})")
        print(f"   jobs created   : {stats.jobs_created}")
        print(f"   jobs updated   : {stats.jobs_updated}")
        print(f"   employers new  : {stats.employers_created}")
        if stats.errors:
            print(f"   errors         : {len(stats.errors)}")
            for message in stats.errors[:5]:
                print(f"      - {message}")
    print(f"\nfinished in {elapsed:.0f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
