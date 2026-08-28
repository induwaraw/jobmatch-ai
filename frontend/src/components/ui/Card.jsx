export default function Card({
  as: Tag = "div",
  tone = "panel",
  interactive = false,
  className = "",
  children,
  ...props
}) {
  const tones = {
    panel: "border-line bg-panel shadow-[0_1px_2px_rgba(18,33,31,0.04)]",
    tint: "border-line bg-brand-tint",
    plain: "border-line bg-transparent",
    brand: "border-transparent bg-brand text-surface",
  };

  return (
    <Tag
      className={`rounded-[14px] border ${tones[tone] ?? tones.panel} ${
        interactive ? "lift cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
