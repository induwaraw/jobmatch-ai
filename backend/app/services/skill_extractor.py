"""Skill extraction using a spaCy PhraseMatcher over the curated taxonomy.

We use phrase matching rather than a trained NER because the skill vocabulary
is fixed and known, and because there is no labelled skill data to train on.
Matching a known list is both more accurate and fully explainable, which
matters for the transparency page.

The taxonomy JSON stays under ml/skills/ as the single source of truth. This
module is the runtime code that consumes it, which is why it lives in the
backend.

Usage from the command line, run from the backend folder:

    python -m app.services.skill_extractor --text "Experienced with Docker"
    python -m app.services.skill_extractor --file some_cv.txt
    python -m app.services.skill_extractor --demo

Usage from Python:

    from app.services.skill_extractor import get_skill_extractor
    skills = get_skill_extractor().extract(cv_text)
"""

import argparse
import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import spacy
from spacy.matcher import PhraseMatcher
from spacy.util import filter_spans

from app.core.config import settings

DEFAULT_TAXONOMY = Path(settings.SKILLS_TAXONOMY_PATH)
DEFAULT_MODEL = "en_core_web_sm"

# Only tokenisation is needed for phrase matching, so the statistical
# components are left out. This makes loading and matching much faster.
UNUSED_PIPES = ["tok2vec", "tagger", "parser", "attribute_ruler", "lemmatizer", "ner"]


@dataclass
class SkillMatch:
    """One canonical skill found in a piece of text."""

    name: str
    subcategories: list[str]
    matched_forms: list[str] = field(default_factory=list)
    count: int = 0

    def as_dict(self) -> dict:
        return {
            "skill": self.name,
            "subcategories": self.subcategories,
            "matched_forms": self.matched_forms,
            "count": self.count,
        }


class SkillExtractor:
    """Finds known IT skills in free text."""

    def __init__(
        self,
        taxonomy_path: Path | str = DEFAULT_TAXONOMY,
        model: str = DEFAULT_MODEL,
    ) -> None:
        self.taxonomy_path = Path(taxonomy_path)
        doc = json.loads(self.taxonomy_path.read_text(encoding="utf-8"))

        self.subcategories: list[str] = doc["subcategories"]
        self.skills: list[dict] = doc["skills"]
        self._by_name = {s["name"]: s for s in self.skills}

        self.nlp = spacy.load(model, exclude=UNUSED_PIPES)

        # attr="LOWER" makes matching case-insensitive. Patterns are built
        # through the same tokenizer as the input text, so awkward forms like
        # "c#" and "ci/cd" tokenize identically on both sides and still match.
        self.matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")

        alias_count = 0
        for skill in self.skills:
            patterns = list(self.nlp.tokenizer.pipe(skill["aliases"]))
            if not patterns:
                continue
            self.matcher.add(skill["name"], patterns)
            alias_count += len(patterns)

        self.alias_count = alias_count

    def extract(self, text: str) -> list[SkillMatch]:
        """Return the distinct skills found in text.

        Each canonical skill appears once, however many of its aliases matched.
        Where two skills overlap in the text the longer match wins, so
        "Spring Boot" is not also reported as "Spring".
        """
        if not text or not text.strip():
            return []

        doc = self.nlp.make_doc(text)
        raw = self.matcher(doc)

        spans = [
            spacy.tokens.Span(doc, start, end, label=match_id)
            for match_id, start, end in raw
        ]
        # Keep the longest non-overlapping spans
        spans = filter_spans(spans)

        found: dict[str, SkillMatch] = {}
        for span in spans:
            name = self.nlp.vocab.strings[span.label]
            entry = self._by_name.get(name)
            if entry is None:
                continue
            match = found.get(name)
            if match is None:
                match = SkillMatch(name=name, subcategories=list(entry["subcategories"]))
                found[name] = match
            match.count += 1
            surface = span.text.lower()
            if surface not in match.matched_forms:
                match.matched_forms.append(surface)

        return sorted(found.values(), key=lambda m: m.name.lower())

    def extract_names(self, text: str) -> set[str]:
        """Just the canonical skill names, for when the detail is not needed."""
        return {m.name for m in self.extract(text)}

    def extract_by_subcategory(self, text: str) -> dict[str, list[SkillMatch]]:
        """Group the matches by subcategory.

        A skill that belongs to several subcategories is listed under each.
        """
        grouped: dict[str, list[SkillMatch]] = {sub: [] for sub in self.subcategories}
        for match in self.extract(text):
            for sub in match.subcategories:
                grouped.setdefault(sub, []).append(match)
        return {sub: matches for sub, matches in grouped.items() if matches}

    def subcategory_counts(self, matches: list[SkillMatch]) -> dict[str, int]:
        """How many matched skills belong to each subcategory.

        General/Tools is left out because it is cross-cutting and would win on
        volume without saying anything about the person's specialism.
        """
        counts: dict[str, int] = {}
        for match in matches:
            for sub in match.subcategories:
                if sub == "General/Tools":
                    continue
                counts[sub] = counts.get(sub, 0) + 1
        return counts


@lru_cache(maxsize=1)
def get_skill_extractor() -> SkillExtractor:
    """Shared extractor instance.

    Building the PhraseMatcher over 1300 surface forms takes a moment, so it
    is done once per process rather than per request.
    """
    return SkillExtractor()


def _print_report(extractor: SkillExtractor, text: str, title: str = "") -> None:
    if title:
        print("=" * 72)
        print(title)
        print("=" * 72)

    matches = extractor.extract(text)
    grouped = extractor.extract_by_subcategory(text)

    print(f"  characters: {len(text)}   distinct skills found: {len(matches)}")
    if not matches:
        print("  (nothing matched)")
        return

    for sub in extractor.subcategories:
        if sub not in grouped:
            continue
        names = [m.name for m in grouped[sub]]
        print(f"\n  {sub}  ({len(names)})")
        for m in grouped[sub]:
            forms = ", ".join(m.matched_forms)
            extra = f"   [matched as: {forms}]" if forms != m.name.lower() else ""
            print(f"     - {m.name}{extra}")


DEMO_TEXTS = {
    "DevOps engineer CV snippet": (
        "Senior DevOps Engineer with 6 years of experience building and running "
        "production infrastructure on AWS. Day to day I work with Docker and K8s, "
        "write Terraform modules for IaC, and maintain Jenkins and GitHub Actions "
        "pipelines for CI/CD. Comfortable with Ansible for configuration management, "
        "Helm charts for releases, and monitoring with Prometheus and Grafana. "
        "Strong Linux administration and bash scripting background, plus Nginx "
        "tuning and load balancing. Familiar with Git, Jira and Agile ceremonies."
    ),
    "Data science CV snippet": (
        "Data Scientist skilled in Python, pandas and NumPy for data wrangling, "
        "with production experience deploying models built in scikit-learn and "
        "TensorFlow. I have delivered NLP projects using spaCy and Hugging Face "
        "transformers, and time series forecasting for demand planning. Strong SQL "
        "skills across PostgreSQL and BigQuery, plus dashboarding in Power BI and "
        "Tableau. Familiar with Apache Spark for big data and MLflow for MLOps. "
        "Comfortable with statistics, hypothesis testing and A/B testing."
    ),
    "Cyber security CV snippet": (
        "Information Security Analyst experienced in penetration testing and "
        "vulnerability assessment. Hands on with Kali Linux, Metasploit, Burp Suite, "
        "Nmap and Wireshark. I run our SIEM on Splunk, handle incident response and "
        "threat detection, and manage firewall rules and IDS tuning. Familiar with "
        "the OWASP Top 10, SQL injection and XSS remediation, and secure coding "
        "reviews. Working knowledge of ISO 27001 and PCI DSS compliance. "
        "Certified Ethical Hacker (CEH), currently studying for OSCP."
    ),
    "UI/UX designer CV snippet": (
        "Product designer focused on UX design for mobile and web. I run user "
        "research and usability testing, build personas and user journey mapping, "
        "then move from wireframing to high fidelity prototyping in Figma. "
        "Previously used Adobe XD and Sketch. I maintain our design system and "
        "style guide, care deeply about accessibility and WCAG compliance, and "
        "work closely with engineers on design handoff. Comfortable in Photoshop "
        "and Illustrator for visual design and iconography."
    ),
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Extract IT skills from text.")
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--text", help="text to analyse")
    source.add_argument("--file", type=Path, help="read the text from a file")
    source.add_argument(
        "--demo", action="store_true", help="run the built in sample texts"
    )
    parser.add_argument("--taxonomy", type=Path, default=DEFAULT_TAXONOMY)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument(
        "--json", action="store_true", help="print JSON instead of a report"
    )
    args = parser.parse_args(argv)

    extractor = SkillExtractor(taxonomy_path=args.taxonomy, model=args.model)
    print(
        f"loaded {len(extractor.skills)} skills / {extractor.alias_count} surface "
        f"forms from {extractor.taxonomy_path.name}\n"
    )

    if args.demo or (not args.text and not args.file):
        for title, text in DEMO_TEXTS.items():
            _print_report(extractor, text, title)
            print()
        return 0

    text = args.file.read_text(encoding="utf-8") if args.file else args.text

    if args.json:
        print(json.dumps([m.as_dict() for m in extractor.extract(text)], indent=2))
    else:
        _print_report(extractor, text, "INPUT TEXT")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
