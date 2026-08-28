const tones = {
  have: "border-brand/15 bg-brand-soft text-brand",
  gap: "border-accent/25 bg-accent-soft text-accent",
  neutral: "border-line bg-panel text-muted",
  solid: "border-transparent bg-brand text-surface",
};

export default function Chip({ tone = "have", icon: Icon, className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1 text-micro font-medium ${
        tones[tone] ?? tones.have
      } ${className}`}
    >
      {Icon && <Icon size={12} strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </span>
  );
}
