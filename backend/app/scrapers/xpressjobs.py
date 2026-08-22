"""Scraper for XpressJobs, our primary job source.

XpressJobs is a React app backed by a public JSON API, so there is no HTML to
parse and no browser needed. Everything here goes through requests.

Run it from the backend folder:

    python -m app.scrapers.xpressjobs --sectors 30
    python -m app.scrapers.xpressjobs --sectors 30,134,50
    python -m app.scrapers.xpressjobs --sectors 30 --limit 5

scrape() is the entry point to call later from a scheduled task.

A note on pagination. The search endpoint does not return a stable ordering, so
two identical requests come back with overlapping but different results. Paging
straight through once therefore misses roughly a third of the jobs. Instead we
poll the pages in a loop and collect job ids into a dict until we either have
as many as the API says exist, or several polls in a row bring back nothing new.
"""

import argparse
import logging
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime

import requests
from sqlalchemy import case, func, select, update
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.employer import Employer
from app.models.job import Job
from app.scrapers.html_text import html_to_text

logger = logging.getLogger(__name__)

BASE_URL = "https://xpress.jobs/api/"
SITE_URL = "https://xpress.jobs"

# Value written to jobs.source
SOURCE = "xpressjobs"

# Which XpressJobs sector maps to which subcategory in our schema.
# XpressJobs also has a Telecommunications sector (id 50). It is deliberately
# left out, because Telecommunications is not one of the six subcategories this
# project uses and forcing it into one of them would mislabel the data.
SECTOR_SUBCATEGORY = {
    30: "Software Engineering",
    134: "QA",
}

SECTOR_NAMES = {
    30: "IT-SWare / Internet",
    134: "Quality Assurance",
}

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

# Seconds to wait between requests so we do not hammer their API
REQUEST_DELAY = 1.5

# The API silently caps a page at 100 records
PAGE_SIZE = 100

# Give up polling a sector after this many polls that add no new job ids
MAX_EMPTY_POLLS = 5

# Hard ceiling so an unstable response can never loop forever
MAX_POLLS_PER_SECTOR = 40

REQUEST_TIMEOUT = 30


@dataclass
class ScrapeStats:
    """What happened while scraping one sector."""

    sector_id: int
    subcategory: str
    record_count: int = 0
    unique_found: int = 0
    polls: int = 0
    details_fetched: int = 0
    detail_failures: int = 0
    jobs_created: int = 0
    jobs_updated: int = 0
    employers_created: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def coverage(self) -> str:
        if not self.record_count:
            return "unknown"
        return f"{self.unique_found}/{self.record_count} ({self.unique_found / self.record_count:.0%})"


def build_session() -> requests.Session:
    """A requests session with a normal browser User-Agent."""
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": f"{SITE_URL}/",
        }
    )
    return session


def get_json(session: requests.Session, path: str, params: dict | None = None):
    """GET one endpoint and return the decoded JSON, pausing afterwards."""
    url = BASE_URL + path
    response = session.get(url, params=params, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()

    # Be polite, the pause belongs after every call we make
    time.sleep(REQUEST_DELAY)

    if not response.content:
        return None
    return response.json()


def slugify(title: str) -> str:
    """Build the URL slug XpressJobs uses in a job link."""
    slug = re.sub(r"[^a-z0-9]+", "-", (title or "").lower())
    return slug.strip("-") or "job"


def build_job_url(job_id: int, title: str) -> str:
    return f"{SITE_URL}/jobs/view/{job_id}/{slugify(title)}"


def collect_sector_listings(
    session: requests.Session, sector_id: int, stats: ScrapeStats
) -> dict[int, dict]:
    """Poll the search endpoint until we have gathered the whole sector.

    Returns a dict of jobId to the listing record.
    """
    found: dict[int, dict] = {}
    empty_polls = 0
    page = 1
    pages_per_sweep = 1

    while stats.polls < MAX_POLLS_PER_SECTOR:
        stats.polls += 1
        batch = get_json(
            session,
            "jobs/searchJobs",
            {"Sectors": sector_id, "Page": page, "PageSize": PAGE_SIZE},
        )

        if not batch:
            # An empty page means we ran past the end, go back to the start
            page = 1
            empty_polls += 1
        else:
            # Every record carries the sector total, so read it once
            if not stats.record_count:
                stats.record_count = int(batch[0].get("recordCount") or 0)
                if stats.record_count:
                    pages_per_sweep = max(
                        1, -(-stats.record_count // PAGE_SIZE)
                    )  # ceiling division

            new_ids = 0
            for record in batch:
                job_id = record.get("jobId")
                if job_id is not None and job_id not in found:
                    found[job_id] = record
                    new_ids += 1

            empty_polls = 0 if new_ids else empty_polls + 1

            logger.info(
                "  poll %-2d page %d: %d returned, %d new, %d unique so far",
                stats.polls,
                page,
                len(batch),
                new_ids,
                len(found),
            )

            # Cycle through the pages, the unstable ordering means revisiting
            # page 1 keeps turning up jobs we have not seen yet
            page = page % pages_per_sweep + 1

        if stats.record_count and len(found) >= stats.record_count:
            logger.info("  reached the reported record count, stopping")
            break

        if empty_polls >= MAX_EMPTY_POLLS:
            logger.info(
                "  %d polls in a row added nothing new, stopping", empty_polls
            )
            break

    stats.unique_found = len(found)
    return found


def fetch_job_detail(
    session: requests.Session, job_id: int, stats: ScrapeStats
) -> dict | None:
    """Fetch the full record for one job, which is where the description is."""
    try:
        detail = get_json(session, "jobs/publishedJob", {"jobId": job_id})
        stats.details_fetched += 1
        return detail
    except requests.RequestException as exc:
        stats.detail_failures += 1
        message = f"detail fetch failed for job {job_id}: {exc}"
        logger.warning("  %s", message)
        stats.errors.append(message)
        return None


def upsert_employer(db: Session, name: str | None, stats: ScrapeStats) -> Employer | None:
    """Find an employer by name, creating it the first time we see it."""
    clean_name = (name or "").strip()
    if not clean_name:
        return None

    employer = db.scalar(select(Employer).where(Employer.name == clean_name))
    if employer is None:
        employer = Employer(name=clean_name)
        db.add(employer)
        # Flush so the new employer gets its id before the job references it
        db.flush()
        stats.employers_created += 1

    return employer


def parse_expiry(value: str | None) -> datetime | None:
    """Parse the API's ISO style date, returning None if it is missing."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def start_of_today() -> datetime:
    """Midnight this morning, used as the cutoff for the active rule."""
    return datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)


def is_job_active(expiry_date: datetime | None) -> bool:
    """Our rule for whether a job is still open.

    A job counts as active until its stated closing date has passed, so a job
    closing today is still active today. A job with no closing date is treated
    as active, because the source has not told us otherwise and assuming it is
    closed would silently drop real vacancies from the demand figures.
    """
    if expiry_date is None:
        return True
    return expiry_date >= start_of_today()


def refresh_active_flags(db: Session) -> tuple[int, int]:
    """Recompute is_active across every XpressJobs row, then report the split.

    This runs after a scrape so that jobs which quietly passed their closing
    date since the last run are marked inactive, even though this run did not
    touch their rows.
    """
    cutoff = start_of_today()

    db.execute(
        update(Job)
        .where(Job.source == SOURCE)
        .values(
            is_active=case(
                (Job.expiry_date.is_(None), True),
                (Job.expiry_date >= cutoff, True),
                else_=False,
            )
        )
    )
    db.commit()

    active = db.scalar(
        select(func.count()).select_from(Job).where(Job.source == SOURCE, Job.is_active.is_(True))
    )
    expired = db.scalar(
        select(func.count()).select_from(Job).where(Job.source == SOURCE, Job.is_active.is_(False))
    )
    return active or 0, expired or 0


def upsert_job(
    db: Session,
    listing: dict,
    detail: dict | None,
    subcategory: str,
    stats: ScrapeStats,
) -> None:
    """Insert or update one job, keyed on source plus the site's own job id."""
    job_id = listing["jobId"]
    source_job_id = str(job_id)

    title = (listing.get("jobTitle") or "").strip()
    employer = upsert_employer(db, listing.get("organizationName"), stats)

    # Prefer the real description, fall back to the short overview
    description = ""
    if detail:
        description = html_to_text(detail.get("jobInfo"))
    if not description:
        description = (listing.get("overview") or "").strip()

    location = (listing.get("locations") or "").strip() or None

    expiry_date = parse_expiry(listing.get("expiryDateOnWebsite"))
    now = datetime.now()

    existing = db.scalar(
        select(Job).where(Job.source == SOURCE, Job.source_job_id == source_job_id)
    )

    if existing is None:
        job = Job(source=SOURCE, source_job_id=source_job_id)
        # first_seen is set here and never written again, so it keeps recording
        # the moment this listing first entered our data
        job.first_seen = now
        db.add(job)
        stats.jobs_created += 1
    else:
        job = existing
        stats.jobs_updated += 1

    job.title = title[:255]
    job.description = description or None
    job.subcategory = subcategory
    job.location = location[:150] if location else None
    job.url = build_job_url(job_id, title)[:500]
    job.employer = employer
    job.scraped_at = now

    # Seen in this run, so refresh last_seen and the closing date
    job.last_seen = now
    job.expiry_date = expiry_date
    job.is_active = is_job_active(expiry_date)


def scrape_sector(
    sector_id: int, db: Session, session: requests.Session, limit: int | None = None
) -> ScrapeStats:
    """Scrape one sector end to end and write it to the database."""
    subcategory = SECTOR_SUBCATEGORY.get(sector_id)
    if subcategory is None:
        raise ValueError(
            f"sector {sector_id} has no subcategory mapping, "
            f"known sectors are {sorted(SECTOR_SUBCATEGORY)}"
        )

    stats = ScrapeStats(sector_id=sector_id, subcategory=subcategory)

    logger.info(
        "Sector %d (%s) -> subcategory %r",
        sector_id,
        SECTOR_NAMES.get(sector_id, "?"),
        subcategory,
    )
    logger.info("Collecting listings")

    listings = collect_sector_listings(session, sector_id, stats)

    logger.info(
        "Collected %d unique jobs, API reported %d, coverage %s",
        stats.unique_found,
        stats.record_count,
        stats.coverage,
    )

    job_ids = sorted(listings)
    if limit is not None:
        job_ids = job_ids[:limit]
        logger.info("Limit set, only processing %d jobs", len(job_ids))

    logger.info("Fetching detail for %d jobs", len(job_ids))

    for index, job_id in enumerate(job_ids, start=1):
        detail = fetch_job_detail(session, job_id, stats)
        upsert_job(db, listings[job_id], detail, subcategory, stats)

        if index % 10 == 0 or index == len(job_ids):
            db.commit()
            logger.info("  saved %d/%d", index, len(job_ids))

    db.commit()
    return stats


def scrape(sectors: list[int] | None = None, limit: int | None = None) -> list[ScrapeStats]:
    """Scrape the given sectors. This is the function to call on a schedule."""
    sectors = sectors or list(SECTOR_SUBCATEGORY)
    session = build_session()
    results: list[ScrapeStats] = []

    db = SessionLocal()
    try:
        for sector_id in sectors:
            results.append(scrape_sector(sector_id, db, session, limit=limit))

        active, expired = refresh_active_flags(db)
        logger.info("Active flags refreshed: %d active, %d expired", active, expired)
    finally:
        db.close()
        session.close()

    return results


def _parse_sectors(value: str) -> list[int]:
    return [int(part) for part in value.split(",") if part.strip()]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scrape IT jobs from XpressJobs.")
    parser.add_argument(
        "--sectors",
        type=_parse_sectors,
        default=list(SECTOR_SUBCATEGORY),
        help="Comma separated sector ids, for example 30 or 30,134,50",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only process this many jobs per sector, useful for a quick test",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )

    unknown = [s for s in args.sectors if s not in SECTOR_SUBCATEGORY]
    if unknown:
        parser.error(
            f"unknown sector ids {unknown}, known ids are {sorted(SECTOR_SUBCATEGORY)}"
        )

    started = time.time()
    results = scrape(sectors=args.sectors, limit=args.limit)
    elapsed = time.time() - started

    print()
    print("=" * 68)
    print("SUMMARY")
    print("=" * 68)
    for stats in results:
        print(f"Sector {stats.sector_id} -> {stats.subcategory}")
        print(f"   coverage        : {stats.coverage} unique jobs vs reported total")
        print(f"   polls used      : {stats.polls}")
        print(f"   details fetched : {stats.details_fetched} (failures {stats.detail_failures})")
        print(f"   jobs created    : {stats.jobs_created}")
        print(f"   jobs updated    : {stats.jobs_updated}")
        print(f"   employers new   : {stats.employers_created}")
        if stats.errors:
            print(f"   errors          : {len(stats.errors)}")
            for message in stats.errors[:5]:
                print(f"      - {message}")
    print(f"\nfinished in {elapsed:.0f}s")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
