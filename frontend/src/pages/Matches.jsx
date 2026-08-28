import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowUpDown,
  Building2,
  ExternalLink,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Container from "../components/ui/Container";
import ScoreRing from "../components/ui/ScoreRing";
import SkillChips from "../components/ui/SkillChips";
import { api, errorMessage } from "../lib/api";

const SUBCATEGORIES = [
  "Software Engineering",
  "Data Science",
  "Cyber Security",
  "DevOps",
  "QA",
  "UI/UX",
];

const SCORE_STEPS = [0, 25, 50, 75];

const SORTS = {
  score: { label: "Match score", compare: (a, b) => b.match_score - a.match_score },
  skills: {
    label: "Skills matched",
    compare: (a, b) => b.matched_count - a.matched_count,
  },
  title: {
    label: "Job title A to Z",
    compare: (a, b) => a.title.localeCompare(b.title),
  },
};

function JobCard({ job }) {
  return (
    <Card as="article" className="p-6 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
        <ScoreRing value={job.match_score} size={78} />

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[1.3rem] font-semibold leading-snug text-ink">
            {job.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.95rem] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={15} strokeWidth={2} aria-hidden="true" />
              {job.company_name || "Company not listed"}
            </span>
            {job.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={15} strokeWidth={2} aria-hidden="true" />
                {job.location}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {job.subcategory && (
              <span className="rounded-[6px] border border-line px-2 py-1 text-[0.8rem] text-muted">
                {job.subcategory}
              </span>
            )}
            <span className="text-[0.8rem] text-muted">
              {job.matched_count} of {job.job_skill_count} required skills matched
            </span>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <SkillChips
              matched={job.matched_skills}
              missing={job.missing_skills}
              limit={12}
            />
          </div>

          {job.url && (
            <div className="mt-6">
              <Button
                variant="secondary"
                size="sm"
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
                View the original advert
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Matches() {
  const { cvId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [subcategory, setSubcategory] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [sortKey, setSortKey] = useState("score");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setData(null);

    api
      .get(`/api/match/${cvId}`, { params: { top_n: 20 } })
      .then((response) => !cancelled && setData(response.data))
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Could not work out your matches."));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [cvId]);

  const all = useMemo(() => data?.matches ?? [], [data]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return all
      .filter((job) => {
        if (subcategory !== "all" && job.subcategory !== subcategory) return false;
        if (job.match_score < minScore) return false;
        if (!term) return true;
        return (
          job.title.toLowerCase().includes(term) ||
          (job.company_name || "").toLowerCase().includes(term)
        );
      })
      .sort(SORTS[sortKey].compare);
  }, [all, query, subcategory, minScore, sortKey]);

  const filtersActive = query.trim() || subcategory !== "all" || minScore > 0;

  function clearFilters() {
    setQuery("");
    setSubcategory("all");
    setMinScore(0);
  }

  if (loading) {
    return (
      <Container className="py-14 lg:py-20">
        <div className="max-w-2xl">
          <h1 className="font-display text-[2.1rem] font-semibold leading-tight text-ink">
            Matching your CV
          </h1>
          <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">
            Reading your skills and scoring them against every open vacancy.
            This takes a moment the first time.
          </p>
        </div>
        <div className="mt-10 space-y-4">
          {[0, 1, 2].map((row) => (
            <Card key={row} className="p-6">
              <div className="flex items-start gap-6">
                <div className="h-[78px] w-[78px] shrink-0 animate-pulse rounded-full bg-line/60" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 w-2/5 animate-pulse rounded bg-line/60" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-line/50" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-line/40" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-14 lg:py-20">
        <div className="max-w-2xl">
          <h1 className="font-display text-[2.1rem] font-semibold leading-tight text-ink">
            We could not show these matches
          </h1>
          <p className="mt-4 rounded-[8px] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
            {error}
          </p>
          <div className="mt-8">
            <Button to="/upload">Back to your CVs</Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-14 lg:py-20">
      <div className="max-w-3xl">
        <Link to="/upload" className="text-sm text-muted underline underline-offset-4">
          Your CVs
        </Link>

        <h1 className="mt-4 font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
          Your matches
        </h1>

        {data?.cv_subcategory ? (
          <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">
            Based on your CV, you look like a{" "}
            <span className="font-medium text-ink">{data.cv_subcategory}</span>{" "}
            profile. We found{" "}
            <span className="font-medium text-ink">{data.cv_skill_count}</span>{" "}
            known skills in it.
          </p>
        ) : (
          <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">
            We could not place your CV into one of the six IT areas, so matches
            are ranked on skill overlap alone.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-4 text-sm text-muted">
        <span>
          <span className="font-medium text-ink">{data?.jobs_considered ?? 0}</span>{" "}
          open vacancies considered
        </span>
        {data?.jobs_excluded_closed > 0 && (
          <span>
            <span className="font-medium text-ink">{data.jobs_excluded_closed}</span>{" "}
            closed vacancies excluded
          </span>
        )}
        {data?.jobs_skipped_no_skills > 0 && (
          <span>
            <span className="font-medium text-ink">{data.jobs_skipped_no_skills}</span>{" "}
            skipped, too few named skills to score
          </span>
        )}
      </div>
      <Card className="mt-8 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
          <div className="lg:flex-1">
            <label
              htmlFor="match-search"
              className="block text-sm font-medium text-ink"
            >
              Search
            </label>
            <div className="relative mt-2">
              <Search
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="match-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Job title or company"
                className="h-11 w-full rounded-[8px] border border-line bg-panel pl-9 pr-3 text-[0.95rem]
                           text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none
                           focus:ring-2 focus:ring-brand/25"
              />
            </div>
          </div>

          <div className="lg:w-56">
            <label
              htmlFor="match-subcategory"
              className="flex items-center gap-1.5 text-sm font-medium text-ink"
            >
              <SlidersHorizontal size={15} strokeWidth={2} aria-hidden="true" />
              Area
            </label>
            <select
              id="match-subcategory"
              value={subcategory}
              onChange={(event) => setSubcategory(event.target.value)}
              className="mt-2 h-11 w-full rounded-[8px] border border-line bg-panel px-3 text-[0.95rem]
                         text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            >
              <option value="all">All areas</option>
              {SUBCATEGORIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:w-60">
            <label
              htmlFor="match-sort"
              className="flex items-center gap-1.5 text-sm font-medium text-ink"
            >
              <ArrowUpDown size={15} strokeWidth={2} aria-hidden="true" />
              Sort by
            </label>
            <select
              id="match-sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
              className="mt-2 h-11 w-full rounded-[8px] border border-line bg-panel px-3 text-[0.95rem]
                         text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            >
              {Object.entries(SORTS).map(([key, sort]) => (
                <option key={key} value={key}>
                  {sort.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <span className="text-sm font-medium text-ink">Minimum score</span>
          <div className="flex flex-wrap gap-2">
            {SCORE_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setMinScore(step)}
                aria-pressed={minScore === step}
                className={`h-9 rounded-[8px] border px-3 text-sm transition-colors ${
                  minScore === step
                    ? "border-brand bg-brand text-surface"
                    : "border-line bg-panel text-muted hover:border-ink/30 hover:text-ink"
                }`}
              >
                {step === 0 ? "Any" : `${step}%+`}
              </button>
            ))}
          </div>

          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted underline underline-offset-4 hover:text-ink"
            >
              <X size={14} strokeWidth={2} aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
      </Card>

      <p className="mt-6 text-sm text-muted">
        Showing <span className="font-medium text-ink">{visible.length}</span> of{" "}
        <span className="font-medium text-ink">{all.length}</span> matches
      </p>

      {all.length === 0 ? (
        <Card className="mt-6 p-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            No matches to show yet
          </h2>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted">
            None of the open vacancies overlapped with the skills we found in
            this CV. That usually means the CV lists few named tools or
            technologies. Adding the specific languages, frameworks and
            platforms you have used will improve this a lot.
          </p>
          <div className="mt-6">
            <Button to="/upload">Upload a different CV</Button>
          </div>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="mt-6 p-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            Nothing matches these filters
          </h2>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted">
            Try a different search term, widen the area, or lower the minimum
            score.
          </p>
          <div className="mt-6">
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {visible.map((job) => (
            <JobCard key={job.job_id} job={job} />
          ))}
        </div>
      )}

      {all.length > 0 && (
        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-muted">
          Scores combine how many of a role's named skills your CV has with
          whether the role sits in your area of IT. They are a guide for
          prioritising applications, not a decision about your suitability.
        </p>
      )}
    </Container>
  );
}
