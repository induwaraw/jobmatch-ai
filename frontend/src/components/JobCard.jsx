import { useNavigate } from "react-router-dom";
import { Building2, Layers, Lock, MapPin } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import Card from "./ui/Card";
import Chip from "./ui/Chip";

export default function JobCard({ job }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function openMatch() {
    navigate(isAuthenticated ? "/upload" : "/login", {
      state: isAuthenticated ? undefined : { from: "/upload" },
    });
  }

  const label = isAuthenticated
    ? "Upload a CV to see your match"
    : "Sign in to see your match";

  return (
    <Card className="lift group flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-h3 font-semibold leading-snug text-ink">
            {job.title}
          </h3>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-small text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} strokeWidth={2} aria-hidden="true" className="shrink-0 text-faint" />
              <span className="truncate">{job.company_name || "Company not listed"}</span>
            </span>
            {job.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} strokeWidth={2} aria-hidden="true" className="shrink-0 text-faint" />
                <span className="truncate">{job.location}</span>
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={openMatch}
          aria-label={label}
          title={label}
          className="relative grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full transition-transform duration-300 hover:scale-105"
        >
          <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90 blur-[3.5px]">
            <circle cx="30" cy="30" r="25" fill="none" stroke="#E6E1D8" strokeWidth="5" />
            <circle
              cx="30"
              cy="30"
              r="25"
              fill="none"
              stroke="#0F3D3E"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="108 157"
              opacity="0.5"
            />
          </svg>
          <span className="absolute grid place-items-center rounded-full bg-surface/80 p-1.5 shadow-[0_1px_3px_rgba(18,33,31,0.12)] transition-colors group-hover:bg-surface">
            <Lock size={14} strokeWidth={2.25} className="text-brand" aria-hidden="true" />
          </span>
        </button>
      </div>

      <p className="mt-4 line-clamp-3 text-small leading-relaxed text-muted">{job.snippet}</p>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          {job.subcategory && <Chip tone="neutral">{job.subcategory}</Chip>}
          <span className="inline-flex items-center gap-1.5 text-micro text-faint">
            <Layers size={13} strokeWidth={2} aria-hidden="true" />
            {job.skill_count} {job.skill_count === 1 ? "skill" : "skills"}
          </span>
        </div>

        <button
          type="button"
          onClick={openMatch}
          className="text-small font-semibold text-brand underline underline-offset-4 transition-colors hover:text-brand-hover"
        >
          {isAuthenticated ? "See your match" : "Unlock match"}
        </button>
      </div>
    </Card>
  );
}
