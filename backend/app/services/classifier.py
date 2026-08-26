"""Subcategory classification, with a fallback that needs no heavy libraries.

Two modes:

  model    the trained DistilBERT classifier is loaded from
           CLASSIFIER_MODEL_PATH. Needs torch and transformers.
  fallback nothing heavy is installed or the path is unset. The subcategory is
           guessed from the skills the extractor found, and jobs fall back to
           the subcategory recorded by the scraper.

The mode is reported back to the caller so the API response can say which one
produced the result. torch is imported lazily inside the loader so that
importing this module never pulls it in.
"""

import logging
from dataclasses import dataclass

from app.core.config import settings
from app.services.skill_extractor import SkillMatch, get_skill_extractor

logger = logging.getLogger(__name__)

SUBCATEGORIES = [
    "Software Engineering",
    "Data Science",
    "Cyber Security",
    "DevOps",
    "QA",
    "UI/UX",
]

MODE_MODEL = "model"
MODE_FALLBACK = "fallback"

# DistilBERT only reads the first 512 tokens, so there is no point sending more
MAX_CHARS_FOR_MODEL = 4000


@dataclass
class Classification:
    subcategory: str | None
    confidence: float | None
    mode: str


class SubcategoryClassifier:
    """Wraps the trained model, falling back to a skill count heuristic."""

    def __init__(self) -> None:
        self._pipeline = None
        self._load_attempted = False
        self._load_error: str | None = None

    @property
    def model_path(self) -> str:
        return (settings.CLASSIFIER_MODEL_PATH or "").strip()

    def _load(self) -> None:
        """Try once to load the model. Never raises."""
        if self._load_attempted:
            return
        self._load_attempted = True

        if not self.model_path:
            self._load_error = "CLASSIFIER_MODEL_PATH is not set"
            return

        from pathlib import Path

        if not Path(self.model_path).exists():
            self._load_error = f"model path does not exist: {self.model_path}"
            return

        try:
            # Imported here so torch is only needed when a model is configured
            from transformers import pipeline

            self._pipeline = pipeline(
                "text-classification",
                model=self.model_path,
                tokenizer=self.model_path,
            )
            logger.info("Loaded subcategory classifier from %s", self.model_path)
        except ImportError as exc:
            self._load_error = f"transformers or torch not installed ({exc})"
        except Exception as exc:
            self._load_error = f"could not load the model ({exc})"

    @property
    def available(self) -> bool:
        self._load()
        return self._pipeline is not None

    @property
    def status(self) -> str:
        self._load()
        if self._pipeline is not None:
            return f"model loaded from {self.model_path}"
        return f"fallback mode: {self._load_error}"

    def classify(self, text: str, skills: list[SkillMatch] | None = None) -> Classification:
        """Classify a piece of text into one of the six subcategories."""
        if not text or not text.strip():
            return Classification(None, None, MODE_FALLBACK)

        if self.available:
            try:
                result = self._pipeline(text[:MAX_CHARS_FOR_MODEL], truncation=True)[0]
                label = result["label"]
                # A model saved without id2label reports LABEL_0 style names
                if label.startswith("LABEL_"):
                    index = int(label.split("_")[1])
                    label = SUBCATEGORIES[index] if index < len(SUBCATEGORIES) else label
                return Classification(label, float(result["score"]), MODE_MODEL)
            except Exception as exc:
                logger.warning("Classifier failed, using fallback: %s", exc)

        return self._heuristic(text, skills)

    def _heuristic(
        self, text: str, skills: list[SkillMatch] | None = None
    ) -> Classification:
        """Pick the subcategory that owns the most of the text's skills.

        Crude, but it uses the same taxonomy the matching uses, so it is at
        least consistent with the rest of the pipeline. Confidence is the
        winning subcategory's share of the counted skills.
        """
        extractor = get_skill_extractor()
        if skills is None:
            skills = extractor.extract(text)

        counts = extractor.subcategory_counts(skills)
        if not counts:
            return Classification(None, None, MODE_FALLBACK)

        total = sum(counts.values())
        winner = max(counts.items(), key=lambda kv: (kv[1], kv[0]))
        return Classification(winner[0], round(winner[1] / total, 3), MODE_FALLBACK)


_classifier: SubcategoryClassifier | None = None


def get_classifier() -> SubcategoryClassifier:
    """Shared classifier instance, so the model is only loaded once."""
    global _classifier
    if _classifier is None:
        _classifier = SubcategoryClassifier()
    return _classifier
