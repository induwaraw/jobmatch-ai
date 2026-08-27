import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, FileText, Mail, Shield, UserRound } from "lucide-react";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Container from "../components/ui/Container";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../lib/api";

function initials(name, email) {
  const source = (name || email || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(value, withTime = false) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export default function Profile() {
  const { user } = useAuth();
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/cv/mine")
      .then((response) => !cancelled && setCvs(response.data))
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Could not load your CVs."));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCharacters = cvs.reduce((sum, cv) => sum + cv.character_count, 0);

  return (
    <Container className="py-14 lg:py-20">
      {/* Account header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div
          aria-hidden="true"
          className="grid h-20 w-20 shrink-0 place-items-center rounded-[12px] bg-brand font-display text-2xl font-semibold text-surface"
        >
          {initials(user?.full_name, user?.email)}
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
            {user?.full_name || "Your account"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.95rem] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Mail size={15} strokeWidth={2} aria-hidden="true" />
              {user?.email}
            </span>
            {user?.role && (
              <span className="inline-flex items-center gap-1.5">
                <Shield size={15} strokeWidth={2} aria-hidden="true" />
                {user.role === "admin" ? "Administrator" : "Standard account"}
              </span>
            )}
            {user?.created_at && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={15} strokeWidth={2} aria-hidden="true" />
                Joined {formatDate(user.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Small summary strip */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { label: "CVs uploaded", value: cvs.length, icon: FileText },
          {
            label: "Text extracted",
            value: `${totalCharacters.toLocaleString()} chars`,
            icon: UserRound,
          },
          {
            label: "Most recent",
            value: cvs.length ? formatDate(cvs[0].uploaded_at) : "None yet",
            icon: CalendarDays,
          },
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <div className="flex items-center gap-2 text-muted">
              <item.icon size={16} strokeWidth={2} aria-hidden="true" />
              <span className="text-sm">{item.label}</span>
            </div>
            <p className="mt-2 font-display text-xl font-semibold text-ink">
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Upload history */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.5rem] font-semibold text-ink">
              Your CVs
            </h2>
            <p className="mt-2 text-[0.95rem] text-muted">
              Every CV you have uploaded, newest first.
            </p>
          </div>
          <Button to="/upload" variant="secondary" size="sm">
            Upload another
          </Button>
        </div>

        {loading ? (
          <p className="mt-6 text-muted">Loading...</p>
        ) : error ? (
          <p className="mt-6 rounded-[8px] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
            {error}
          </p>
        ) : cvs.length === 0 ? (
          <Card className="mt-6 p-8">
            <h3 className="font-display text-lg font-semibold text-ink">
              No CVs yet
            </h3>
            <p className="mt-2 max-w-lg text-[0.95rem] leading-relaxed text-muted">
              Upload a PDF or DOCX to see which open vacancies fit your skills.
            </p>
            <div className="mt-6">
              <Button to="/upload">Upload your CV</Button>
            </div>
          </Card>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {cvs.map((cv) => (
              <li
                key={cv.id}
                className="flex flex-wrap items-center justify-between gap-4 py-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="shrink-0 text-muted"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{cv.filename}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(cv.uploaded_at, true)} ·{" "}
                      {cv.character_count.toLocaleString()} characters
                    </p>
                  </div>
                </div>
                <Link
                  to={`/matches/${cv.id}`}
                  className="shrink-0 text-sm font-medium text-brand underline underline-offset-4"
                >
                  See matches
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
