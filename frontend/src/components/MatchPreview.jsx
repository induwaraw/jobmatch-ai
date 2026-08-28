import { useEffect, useState } from "react";
import { Building2, MapPin, Sparkles, TrendingUp } from "lucide-react";

import { usePrefersReducedMotion } from "../hooks/useMotion";
import Card from "./ui/Card";
import Chip from "./ui/Chip";
import ScoreRing from "./ui/ScoreRing";

const MATCHED = ["Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Python"];
const MISSING = ["AWS CloudFormation", "ELK Stack"];
const TREND = [41, 43, 42, 46, 48, 47, 51, 54, 53, 57, 60, 62];

function Sparkline({ points, width = 150, height = 38 }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const stepX = width / (points.length - 1);
  const y = (value) => height - ((value - min) / (max - min || 1)) * (height - 8) - 4;

  const line = points
    .map((value, index) => `${index === 0 ? "M" : "L"}${(index * stepX).toFixed(1)},${y(value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F3D3E" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0F3D3E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={line} fill="none" stroke="#0F3D3E" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx={width} cy={y(points.at(-1))} r="3.5" fill="#C2571B" />
    </svg>
  );
}

export default function MatchPreview() {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(reduced ? MATCHED.length + MISSING.length : 0);

  useEffect(() => {
    if (reduced) return;
    const total = MATCHED.length + MISSING.length;
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setStep(current);
      if (current >= total) clearInterval(timer);
    }, 110);
    return () => clearInterval(timer);
  }, [reduced]);

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -right-3 -top-3 hidden h-24 w-24 rounded-full bg-accent-soft blur-2xl sm:block"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-5 -left-5 hidden h-32 w-32 rounded-full bg-brand-soft blur-2xl sm:block"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-4 -right-4 hidden rounded-[14px] border border-line bg-brand-tint sm:block"
        style={{ inset: "auto -1rem -1rem auto", width: "100%", height: "100%" }}
      />

      <Card className="relative overflow-hidden p-5 shadow-[0_24px_56px_-28px_rgba(18,33,31,0.32)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-micro font-semibold text-brand">
            <Sparkles size={12} strokeWidth={2.5} aria-hidden="true" />
            Example match
          </span>
          <span className="text-micro text-faint">Illustration</span>
        </div>

        <div className="mt-5 flex items-start gap-4 sm:gap-5">
          <ScoreRing value={91} size={84} />
          <div className="min-w-0">
            <h3 className="font-display text-h3 font-semibold leading-snug text-ink">
              DevOps Engineer
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-muted">
              <span className="inline-flex items-center gap-1">
                <Building2 size={12} strokeWidth={2} aria-hidden="true" />
                eBeyonds
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} strokeWidth={2} aria-hidden="true" />
                Colombo
              </span>
            </div>
            <p className="mt-2.5 text-small leading-relaxed text-muted">
              Matched 10 of the 14 skills this role asks for.
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <p className="text-micro font-semibold uppercase tracking-[0.1em] text-muted">
            Skills you have
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {MATCHED.map((skill, index) => (
              <span
                key={skill}
                className="transition-all duration-500"
                style={{
                  opacity: step > index ? 1 : 0,
                  transform: step > index ? "none" : "translateY(6px)",
                }}
              >
                <Chip>{skill}</Chip>
              </span>
            ))}
          </div>

          <p className="mt-4 text-micro font-semibold uppercase tracking-[0.1em] text-muted">
            Skills to work on
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {MISSING.map((skill, index) => (
              <span
                key={skill}
                className="transition-all duration-500"
                style={{
                  opacity: step > MATCHED.length + index ? 1 : 0,
                  transform: step > MATCHED.length + index ? "none" : "translateY(6px)",
                }}
              >
                <Chip tone="gap">{skill}</Chip>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="inline-flex items-center gap-1.5 text-small font-medium text-ink">
              <TrendingUp size={14} strokeWidth={2.25} className="text-brand" aria-hidden="true" />
              DevOps demand
            </p>
            <p className="mt-1 text-micro text-muted">Last 12 months</p>
          </div>
          <Sparkline points={TREND} />
        </div>
      </Card>
    </div>
  );
}
