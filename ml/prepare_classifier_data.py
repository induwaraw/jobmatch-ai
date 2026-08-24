"""Build the CV subcategory classifier training set from LinkedIn job postings.

The resume datasets on Kaggle could not supply six trainable IT subcategories,
so the classifier is trained on job postings instead. The ~100 unique real
resumes are kept aside as a held-out CV validation set.

What this script does:
  1. Loads data/kaggle_linkedin/postings.csv
  2. Filters to IT postings by job title, with an exclusion list for the many
     non-IT roles that contain the word "engineer"
  3. Labels each IT posting into one of the six project subcategories using
     ordered keyword rules on the title, first match wins
  4. Drops anything that does not clearly fit one of the six
  5. Cleans the description text and removes duplicate descriptions
  6. Writes ml/data/classifier_train.csv and ml/data/label_spotcheck.csv

Run from the project root with the ml venv:

    ml\\.venv\\Scripts\\python.exe ml\\prepare_classifier_data.py
"""

import argparse
import html
import re
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
POSTINGS_CSV = PROJECT_ROOT / "data" / "kaggle_linkedin" / "postings.csv"
OUTPUT_DIR = PROJECT_ROOT / "ml" / "data"
TRAIN_CSV = OUTPUT_DIR / "classifier_train.csv"
SPOTCHECK_CSV = OUTPUT_DIR / "label_spotcheck.csv"

SUBCATEGORIES = [
    "Software Engineering",
    "Data Science",
    "Cyber Security",
    "DevOps",
    "QA",
    "UI/UX",
]

# Descriptions shorter than this are too thin to learn anything from
MIN_DESCRIPTION_CHARS = 200

SPOTCHECK_SIZE = 30
RANDOM_SEED = 42


# ---------------------------------------------------------------------------
# Stage 1: is the posting an IT role at all?
# ---------------------------------------------------------------------------

# Broad first pass. "engineer" is included because most IT titles use it, but
# on LinkedIn it also matches building, sales and locomotive engineers, so the
# exclusion list below does the real work.
IT_TERMS = [
    r"software", r"developer", r"programmer", r"\bdev\b", r"engineer",
    r"data scien", r"data analyst", r"data engineer", r"machine learning",
    r"\bml\b", r"\bai\b", r"artificial intelligence", r"deep learning", r"\bnlp\b",
    r"analytics", r"business intelligence", r"\bbi\b", r"big data", r"database",
    r"\bdba\b", r"\bsql\b", r"devops", r"\bsre\b", r"site reliability",
    r"cloud", r"kubernetes", r"docker", r"\baws\b", r"\bazure\b", r"platform",
    r"infrastructure", r"cyber", r"information security", r"infosec",
    r"penetration test", r"pentest", r"\bsoc\b", r"appsec", r"vulnerability",
    r"\bqa\b", r"quality assurance", r"\bsdet\b", r"tester", r"test automation",
    r"\bux\b", r"\bui\b", r"user experience", r"user interface",
    r"front.?end", r"back.?end", r"full.?stack", r"\bweb\b", r"mobile",
    r"\bios\b", r"android", r"\bjava\b", r"python", r"\.net", r"\bc#\b",
    r"javascript", r"\breact\b", r"\bnode\b", r"salesforce", r"\bsap\b",
    r"network", r"systems admin", r"sysadmin", r"help ?desk", r"technical support",
    r"\bit \b", r"\bit$", r"information technology", r"solutions architect",
    r"scrum master", r"\bapi\b", r"embedded", r"firmware",
]

# Titles that look like IT to the list above but are not. Everything here is
# removed before labelling, so these never reach the six classes.
NOT_IT_TERMS = [
    # Traditional engineering disciplines
    r"civil engineer", r"mechanical engineer", r"electrical engineer",
    r"structural engineer", r"chemical engineer", r"industrial engineer",
    r"process engineer", r"manufacturing engineer", r"environmental engineer",
    r"geotechnical", r"petroleum", r"aerospace", r"nuclear engineer",
    r"materials engineer", r"metallurg", r"mining engineer",
    # Facilities, plant and field roles
    r"building engineer", r"facilities engineer", r"maintenance engineer",
    r"field engineer", r"service engineer", r"plant engineer",
    r"stationary engineer", r"hvac", r"plumb", r"locomotive", r"train engineer",
    r"marine engineer", r"flight engineer", r"field services engineer",
    r"engineer.*(construction|hvac|plumbing)",
    # Non-IT roles that leaked through in the first pass
    r"controls? engineer", r"automotive engineer", r"packaging engineer",
    r"mechanical design engineer", r"validation engineer",
    r"manufacturing design", r"tooling engineer", r"welding engineer",
    r"\bcnc\b", r"machine operator", r"industrial automation",
    # Sales and media roles that use the word engineer
    r"sales engineer", r"pre.?sales engineer", r"audio engineer",
    r"sound engineer", r"broadcast engineer", r"recording engineer",
    # Non-IT quality roles. Software QA is caught by the QA rule later, this
    # removes manufacturing and food quality jobs that share the wording.
    r"quality engineer.*(manufactur|weld|mechanic|food|supplier|automotive)",
    r"(manufactur|weld|mechanic|food|supplier|automotive).*quality engineer",
    r"supplier quality", r"food safety",
    # Healthcare and unrelated
    r"medical", r"\bnurse\b", r"clinical", r"pharmac", r"biomedical",
    r"web content writer", r"web editor",
]


# ---------------------------------------------------------------------------
# Stage 2: map an IT title to one of the six subcategories.
#
# Order matters. The specialisms are checked before the general software rule,
# otherwise "Software Test Engineer" would be labelled Software Engineering
# instead of QA, and "Security Engineer" and "Data Engineer" would both be
# swallowed by the software rule. First match wins.
# ---------------------------------------------------------------------------
LABEL_RULES = [
    (
        "Cyber Security",
        [
            r"cyber", r"information security", r"infosec", r"security engineer",
            r"security analyst", r"security architect", r"security operations",
            r"penetration test", r"pentest", r"\bsoc analyst", r"appsec",
            r"application security", r"vulnerability", r"threat", r"malware",
            r"identity and access", r"\biam\b", r"security consultant",
            r"security specialist", r"\bgrc\b",
        ],
    ),
    (
        # Before software, so "software test engineer" lands here.
        # Every pattern needs an actual software testing signal. The bare word
        # "quality" is deliberately not matched, because "Quality Engineer" and
        # "Quality Engineer Technician" are usually manufacturing or food roles
        # rather than software testing.
        "QA",
        [
            r"\bqa\b", r"quality assurance", r"software quality", r"\bsdet\b",
            r"software test", r"software tester", r"test engineer", r"tester",
            r"test automation", r"automation test", r"test analyst", r"test lead",
        ],
    ),
    (
        # Only clear DevOps, SRE, platform and cloud operations titles.
        # A bare "Systems Engineer" is not matched, it is too ambiguous on
        # LinkedIn and pulls in sales roles like "Systems Engineer - Major
        # Accounts". DevOps being smaller is preferred over being polluted.
        "DevOps",
        [
            r"devops", r"devsecops", r"\bsre\b", r"site reliability",
            r"platform engineer", r"infrastructure engineer", r"cloud engineer",
            r"cloud architect", r"cloud infrastructure", r"cloud operations",
            r"kubernetes", r"docker", r"build and release", r"release engineer",
            r"ci/cd", r"linux engineer",
        ],
    ),
    (
        # Before software, so "data engineer" is not read as a software role
        "Data Science",
        [
            r"data scien", r"machine learning", r"\bml engineer", r"\bai engineer",
            r"deep learning", r"\bnlp\b", r"data engineer", r"data analyst",
            r"business intelligence", r"\bbi developer", r"\bbi analyst",
            r"big data", r"analytics engineer", r"data architect", r"statistician",
            r"quantitative analyst", r"\betl\b", r"data warehouse", r"\bhadoop\b",
            r"artificial intelligence", r"data modeler",
        ],
    ),
    (
        # Design roles only. Front end development is software engineering.
        "UI/UX",
        [
            r"\bux\b", r"\bui/ux\b", r"user experience", r"user interface",
            r"ux research", r"ux design", r"ui design", r"product designer",
            r"interaction designer", r"visual designer", r"web designer",
            r"graphic designer", r"design system",
        ],
    ),
    (
        # General development, checked last so it does not steal the specialisms
        "Software Engineering",
        [
            r"software engineer", r"software developer", r"software architect",
            r"full.?stack", r"front.?end", r"back.?end", r"web developer",
            r"application developer", r"mobile developer", r"\bios developer",
            r"android developer", r"java developer", r"python developer",
            r"\.net developer", r"c# developer", r"php developer",
            r"ruby developer", r"golang", r"programmer", r"\bsde\b",
            r"salesforce developer", r"\bsap developer", r"embedded software",
            r"firmware", r"\bapi developer", r"development engineer",
            r"software development", r"\bdeveloper\b", r"\bengineer.*software",
        ],
    ),
]

IT_RE = re.compile("|".join(IT_TERMS), re.I)
NOT_IT_RE = re.compile("|".join(NOT_IT_TERMS), re.I)
COMPILED_RULES = [
    (name, re.compile("|".join(patterns), re.I)) for name, patterns in LABEL_RULES
]

TAG_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"\s+")


def clean_text(raw: str) -> str:
    """Strip HTML and collapse whitespace, leaving casing and punctuation alone."""
    if not isinstance(raw, str) or not raw:
        return ""
    text = html.unescape(raw)
    text = TAG_RE.sub(" ", text)
    text = text.replace("\xa0", " ")
    text = WHITESPACE_RE.sub(" ", text)
    return text.strip()


def label_title(title: str) -> str | None:
    """Return the subcategory for a title, or None if it fits none of the six."""
    for name, pattern in COMPILED_RULES:
        if pattern.search(title):
            return name
    return None


def build(postings_csv: Path) -> tuple[pd.DataFrame, dict]:
    """Run the whole pipeline and return the final frame plus a stats dict."""
    stats: dict[str, int] = {}

    df = pd.read_csv(
        postings_csv, usecols=["job_id", "title", "description"], low_memory=False
    )
    stats["postings_total"] = len(df)

    df["title"] = df["title"].fillna("").astype(str)
    df["description"] = df["description"].fillna("").astype(str)

    is_it = df["title"].str.contains(IT_RE, regex=True) & ~df["title"].str.contains(
        NOT_IT_RE, regex=True
    )
    it = df[is_it].copy()
    stats["it_postings"] = len(it)

    it["label"] = it["title"].map(label_title)
    stats["unmapped"] = int(it["label"].isna().sum())

    mapped = it[it["label"].notna()].copy()
    stats["mapped"] = len(mapped)

    mapped["text"] = mapped["description"].map(clean_text)

    before_short = len(mapped)
    mapped = mapped[mapped["text"].str.len() >= MIN_DESCRIPTION_CHARS]
    stats["dropped_short"] = before_short - len(mapped)

    before_dupes = len(mapped)
    mapped = mapped.drop_duplicates(subset=["text"])
    stats["dropped_duplicates"] = before_dupes - len(mapped)

    mapped = mapped.rename(columns={"title": "source_title"})
    final = mapped[["text", "label", "source_title"]].reset_index(drop=True)
    stats["final_rows"] = len(final)

    return final, stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Build the classifier training set from LinkedIn postings."
    )
    parser.add_argument("--postings", type=Path, default=POSTINGS_CSV)
    parser.add_argument("--out", type=Path, default=TRAIN_CSV)
    parser.add_argument("--spotcheck", type=Path, default=SPOTCHECK_CSV)
    args = parser.parse_args(argv)

    if not args.postings.exists():
        parser.error(f"postings file not found: {args.postings}")

    print(f"reading {args.postings}")
    final, stats = build(args.postings)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    final.to_csv(args.out, index=False, encoding="utf-8")

    spotcheck = final.sample(
        n=min(SPOTCHECK_SIZE, len(final)), random_state=RANDOM_SEED
    )[["source_title", "label"]]
    spotcheck.to_csv(args.spotcheck, index=False, encoding="utf-8")

    line = "=" * 72
    print()
    print(line)
    print("PIPELINE")
    print(line)
    print(f"  postings in file            : {stats['postings_total']:,}")
    print(f"  IT postings after filter    : {stats['it_postings']:,}")
    print(f"  unmapped, dropped           : {stats['unmapped']:,}")
    print(f"  mapped to the six classes   : {stats['mapped']:,}")
    print(f"  dropped, description < {MIN_DESCRIPTION_CHARS}  : {stats['dropped_short']:,}")
    print(f"  dropped, duplicate text     : {stats['dropped_duplicates']:,}")
    print(f"  final rows                  : {stats['final_rows']:,}")

    print()
    print(line)
    print("FINAL PER CLASS COUNTS AFTER DEDUP")
    print(line)
    counts = final["label"].value_counts()
    total = int(counts.sum())
    print(f"{'SUBCATEGORY':24} {'ROWS':>8} {'SHARE':>8}  {'MEAN CHARS':>11}")
    print("-" * 56)
    for name in SUBCATEGORIES:
        n = int(counts.get(name, 0))
        mean_chars = int(final[final["label"] == name]["text"].str.len().mean()) if n else 0
        print(f"{name:24} {n:8,} {n / total:7.1%}  {mean_chars:11,}")
    print("-" * 56)
    print(f"{'TOTAL':24} {total:8,} {1.0:7.1%}")
    print(f"\n  duplicate texts remaining: {int(final['text'].duplicated().sum())}")
    print(f"  imbalance ratio, largest to smallest: "
          f"{counts.max() / counts.min():.1f}x")

    print()
    print(f"written: {args.out}")
    print(f"written: {args.spotcheck}  ({len(spotcheck)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
