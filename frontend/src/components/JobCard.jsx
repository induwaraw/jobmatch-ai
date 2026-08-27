import { useNavigate } from "react-router-dom";
import { Building2, Layers, Lock, MapPin } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import Card from "./ui/Card";

/**
 * A vacancy as shown on the public homepage.
 *
 * Signed out, the match score is deliberately hidden behind a blurred ring
 * with a lock, so the value of the matching is visible without giving it away.
 * Signed in, the card sends you into the real flow.
 */
export default function JobCard({ job }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function openMatch() {
    navigate(isAuthenticated ? "/upload" : "/login", {
      state: isAuthenticated ? undefined : { from: "/upload" },
    });
  }

  return (
    <Card className="lift flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-[1.15rem] font-semibold leading-snug text-ink">
            {job.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} strokeWidth={2} aria-hidden="true" />
              {job.company_name || "Company not listed"}
            </span>
            {job.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} strokeWidth={2} aria-hidden="true" />
                {job.location}
              </span>
            )}
          </div>
        </div>

        {/* The gated match indicator */}
        <button
          type="button"
          onClick={openMatch}
          className="group relative grid h-[62px] w-[62px] shrink-0 place-items-center rounded-full"
          aria-label={
            isAuthenticated
              ? "Upload a CV to see your match for this role"
              : "Sign in to see your match for this role"
          }
          title={isAuthenticated ? "Upload a CV to see your match" : "Sign in to see your match"}
        >
          <svg width="62" height="62" viewBox="0 0 62 62" className="-rotate-90 blur-[3px]">
            <circle cx="31" cy="31" r="26" fill="none" stroke="#E3DFD6" strokeWidth="5" />
            <circle
              cx="31"
              cy="31"
              r="26"
              fill="none"
              stroke="#0F3D3E"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="112 163"
              opacity="0.55"
            />
          </svg>
          <span className="absolute grid place-items-center rounded-full bg-surface/70 p-1.5 transition-colors group-hover:bg-surface">
            <Lock size={15} strokeWidth={2.25} className="text-brand" aria-hidden="true" />
          </span>
        </button>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted">{job.snippet}</p>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          {job.subcategory && (
            <span className="rounded-[6px] border border-line px-2 py-1 text-[0.78rem] text-muted">
              {job.subcategory}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[0.78rem] text-muted">
            <Layers size={13} strokeWidth={2} aria-hidden="true" />
            {job.skill_count} {job.skill_count === 1 ? "skill" : "skills"} listed
          </span>
        </div>

        <button
          type="button"
          onClick={openMatch}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-hover"
        >
          {isAuthenticated ? "See your match" : "Sign in to see your match"}
        </button>
      </div>
    </Card>
  );
}
