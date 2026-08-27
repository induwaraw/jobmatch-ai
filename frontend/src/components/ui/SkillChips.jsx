import { useState } from "react";
import { Check, Plus } from "lucide-react";

/**
 * The two skill lists under every match: what the CV has, and what the advert
 * asks for that it does not. Teal for have, cinnamon for gap, matching the
 * landing preview. Long lists collapse rather than being cut off, so nothing
 * is hidden permanently.
 */

export function Chip({ tone = "have", children }) {
  const tones = {
    have: "bg-brand-soft text-brand",
    gap: "border border-accent/25 bg-accent-soft text-accent",
  };
  return (
    <span className={`rounded-[6px] px-2 py-1 text-[0.8rem] ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SkillList({ title, icon: Icon, skills, tone, emptyText, limit }) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = limit != null && skills.length > limit;
  const shown = collapsible && !expanded ? skills.slice(0, limit) : skills;

  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <Icon
          size={15}
          strokeWidth={2.25}
          className={tone === "gap" ? "text-accent" : "text-brand"}
          aria-hidden="true"
        />
        {title} <span className="font-normal text-muted">({skills.length})</span>
      </p>

      {skills.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {shown.map((skill) => (
            <Chip key={skill} tone={tone}>
              {skill}
            </Chip>
          ))}

          {collapsible && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="rounded-[6px] px-2 py-1 text-[0.8rem] font-medium text-brand underline underline-offset-4 hover:text-brand-hover"
            >
              {expanded ? "Show fewer" : `Show all ${skills.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SkillChips({ matched = [], missing = [], limit = 12 }) {
  return (
    <div className="space-y-5">
      <SkillList
        title="Skills you have"
        icon={Check}
        skills={matched}
        tone="have"
        limit={limit}
        emptyText="None of this role's listed skills were found in your CV."
      />
      <SkillList
        title="Skills to work on"
        icon={Plus}
        skills={missing}
        tone="gap"
        limit={limit}
        emptyText="You have every skill this role lists."
      />
    </div>
  );
}
