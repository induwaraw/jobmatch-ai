import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  Database,
  FileText,
  Layers,
  LineChart,
  ShieldAlert,
  Users,
} from "lucide-react";

import Card from "../components/ui/Card";
import Container from "../components/ui/Container";
import { api, errorMessage } from "../lib/api";

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-muted">
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold leading-none text-ink">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
    </Card>
  );
}

function BreakdownBar({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.name}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-ink">{row.name}</span>
            <span className="text-muted">
              {row.count.toLocaleString()}{" "}
              <span className="text-muted/70">
                ({Math.round((row.count / total) * 100)}%)
              </span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(row.count / total) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/admin/stats")
      .then((response) => !cancelled && setStats(response.data))
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 403) setForbidden(true);
        else setError(errorMessage(err, "Could not load the statistics."));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (forbidden) {
    return (
      <Container className="py-14 lg:py-20">
        <div className="max-w-xl">
          <ShieldAlert
            size={28}
            strokeWidth={2}
            aria-hidden="true"
            className="text-accent"
          />
          <h1 className="mt-4 font-display text-[2.1rem] font-semibold leading-tight text-ink">
            Administrators only
          </h1>
          <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">
            This account does not have the admin role, so the platform
            statistics are not available to it.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-14 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-accent">
          Administration
        </p>
        <h1 className="mt-4 font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
          Platform statistics
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">
          What is currently held in the system: accounts, scraped vacancies,
          uploaded CVs and the demand forecasts.
        </p>
      </div>

      {loading && <p className="mt-10 text-muted">Loading statistics...</p>}

      {error && (
        <p className="mt-10 rounded-[8px] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {stats && (
        <>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Registered users"
              value={stats.total_users}
              note={`${stats.active_users} active, ${stats.admin_users} admin`}
            />
            <StatCard
              icon={FileText}
              label="CVs uploaded"
              value={stats.total_cvs}
              note={`${stats.parsed_cvs} with text extracted`}
            />
            <StatCard
              icon={Briefcase}
              label="Jobs scraped"
              value={stats.total_jobs}
              note={`${stats.open_jobs} open, ${stats.expired_jobs} closed`}
            />
            <StatCard
              icon={Building2}
              label="Employers"
              value={stats.total_employers}
            />
            <StatCard
              icon={Database}
              label="Jobs with real text"
              value={stats.jobs_with_text}
              note="Usable for matching"
            />
            <StatCard
              icon={Layers}
              label="Skills in taxonomy"
              value={stats.total_skills}
            />
            <StatCard
              icon={LineChart}
              label="Forecast rows"
              value={stats.total_forecasts}
              note="Six areas, two horizons"
            />
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-ink">
                Jobs by area
              </h2>
              <p className="mt-2 text-sm text-muted">
                Using the classifier's label where one exists, otherwise the
                label the scraper recorded.
              </p>
              <BreakdownBar rows={stats.jobs_by_subcategory} />
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-ink">
                Jobs by source
              </h2>
              <p className="mt-2 text-sm text-muted">
                Which job board each vacancy came from.
              </p>
              <BreakdownBar rows={stats.jobs_by_source} />
            </Card>
          </div>
        </>
      )}
    </Container>
  );
}
