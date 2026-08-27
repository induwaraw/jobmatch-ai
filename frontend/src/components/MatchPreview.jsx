import Card from "./ui/Card";
import ScoreRing from "./ui/ScoreRing";
import { Chip } from "./ui/SkillChips";

/**
 * The visual anchor for the hero. Rather than a decorative shape, this shows
 * the thing the product actually produces: a scored match with its skill gap,
 * and the demand trend behind that subcategory.
 *
 * The content is illustrative and labelled as such, so it is not mistaken for
 * a real result.
 */

const MATCHED = ["Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Python"];
const MISSING = ["AWS CloudFormation", "ELK Stack"];

// Twelve points of a gently rising trend, drawn as a sparkline
const TREND = [41, 43, 42, 46, 48, 47, 51, 54, 53, 57, 60, 62];

function Sparkline({ points, width = 168, height = 40 }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const stepX = width / (points.length - 1);

  const path = points
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / (max - min || 1)) * (height - 6) - 3;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke="#0F3D3E" strokeWidth="1.75" strokeLinecap="round" />
      <circle
        cx={width}
        cy={height - ((points.at(-1) - min) / (max - min || 1)) * (height - 6) - 3}
        r="3"
        fill="#C2571B"
      />
    </svg>
  );
}

export default function MatchPreview() {
  return (
    <div className="relative">
      {/* A quiet offset panel behind the card, instead of a glow or blob */}
      <div
        aria-hidden="true"
        className="absolute -bottom-4 -right-4 hidden h-full w-full rounded-[10px] border border-line bg-brand-soft/40 sm:block"
      />

      <Card className="relative p-6 sm:p-7">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">
          Example match
        </p>

        <div className="mt-4 flex items-start gap-5">
          <ScoreRing value={91} />
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold leading-snug text-ink">
              DevOps Engineer
            </h3>
            <p className="mt-1 text-sm text-muted">Colombo, Western Province</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Matched 10 of the 14 skills this role asks for.
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <p className="text-sm font-medium text-ink">Skills you have</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {MATCHED.map((skill) => (
              <Chip key={skill}>{skill}</Chip>
            ))}
          </div>

          <p className="mt-5 text-sm font-medium text-ink">Skills to work on</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {MISSING.map((skill) => (
              <Chip key={skill} tone="gap">
                {skill}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="text-sm font-medium text-ink">DevOps demand</p>
            <p className="mt-1 text-sm text-muted">Last 12 months</p>
          </div>
          <Sparkline points={TREND} />
        </div>
      </Card>
    </div>
  );
}
