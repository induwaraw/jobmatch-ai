import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";

import { api, errorMessage } from "../lib/api";
import Button from "./ui/Button";
import Card from "./ui/Card";
import JobCard from "./JobCard";
import Reveal from "./Reveal";

const SUBCATEGORIES = [
  "Software Engineering",
  "Data Science",
  "Cyber Security",
  "DevOps",
  "QA",
  "UI/UX",
];

const PAGE_SIZE = 6;

export default function JobSearch() {
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState(params.get("q") || "");
  const [subcategory, setSubcategory] = useState(params.get("area") || "all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const resultsRef = useRef(null);

  const fetchJobs = useCallback(
    async (nextQuery, nextSubcategory, nextLimit) => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/api/jobs", {
          params: {
            ...(nextQuery.trim() ? { q: nextQuery.trim() } : {}),
            ...(nextSubcategory !== "all" ? { subcategory: nextSubcategory } : {}),
            limit: nextLimit,
          },
        });
        setJobs(data.jobs);
        setTotal(data.total);
      } catch (err) {
        setError(errorMessage(err, "Could not load the vacancies."));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const urlQuery = params.get("q") || "";
    const urlArea = params.get("area") || "all";
    setQuery(urlQuery);
    setSubcategory(urlArea);
    setLimit(PAGE_SIZE);
    fetchJobs(urlQuery, urlArea, PAGE_SIZE);
  }, [params, fetchJobs]);

  function handleSubmit(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (subcategory !== "all") next.set("area", subcategory);
    setParams(next, { replace: true });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showMore() {
    const next = limit + PAGE_SIZE;
    setLimit(next);
    fetchJobs(query, subcategory, next);
  }

  return (
    <div>
      <Card as="form" onSubmit={handleSubmit} className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:flex-1">
            <label htmlFor="job-q" className="block text-sm font-medium text-ink">
              Search open vacancies
            </label>
            <div className="relative mt-2">
              <Search
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="job-q"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Job title or company, for example DevOps or Dialog"
                className="h-11 w-full rounded-[8px] border border-line bg-panel pl-9 pr-3 text-[0.95rem]
                           text-ink placeholder:text-muted/60 transition-colors focus:border-brand
                           focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
            </div>
          </div>

          <div className="sm:w-56">
            <label
              htmlFor="job-area"
              className="flex items-center gap-1.5 text-sm font-medium text-ink"
            >
              <SlidersHorizontal size={15} strokeWidth={2} aria-hidden="true" />
              Area
            </label>
            <select
              id="job-area"
              value={subcategory}
              onChange={(event) => setSubcategory(event.target.value)}
              className="mt-2 h-11 w-full rounded-[8px] border border-line bg-panel px-3 text-[0.95rem]
                         text-ink transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            >
              <option value="all">All areas</option>
              {SUBCATEGORIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" size="md" className="sm:h-11">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            Search
          </Button>
        </div>
      </Card>

      <div ref={resultsRef} className="mt-6 scroll-mt-24">
        <p className="text-sm text-muted">
          {loading ? (
            "Searching..."
          ) : (
            <>
              <span className="font-medium text-ink">{total}</span>{" "}
              {total === 1 ? "open vacancy" : "open vacancies"}
              {query.trim() && (
                <>
                  {" "}
                  matching <span className="font-medium text-ink">“{query.trim()}”</span>
                </>
              )}
              {subcategory !== "all" && (
                <>
                  {" "}
                  in <span className="font-medium text-ink">{subcategory}</span>
                </>
              )}
            </>
          )}
        </p>

        {error && (
          <p className="mt-4 rounded-[8px] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
            {error}
          </p>
        )}

        {!loading && !error && jobs.length === 0 && (
          <Card className="mt-4 p-8">
            <h3 className="font-display text-lg font-semibold text-ink">
              No vacancies match that
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
              Try a broader term, or set the area back to all areas.
            </p>
          </Card>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {jobs.map((job, index) => (
            <Reveal key={job.id} delay={Math.min(index, 5) * 60}>
              <JobCard job={job} />
            </Reveal>
          ))}
        </div>

        {!loading && jobs.length < total && (
          <div className="mt-6">
            <Button variant="secondary" onClick={showMore}>
              Show more vacancies
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
