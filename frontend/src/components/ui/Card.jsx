/**
 * A panel that sits above the paper background. Hairline border, no drop
 * shadow, which keeps the interface flat and calm rather than floaty.
 */
export default function Card({ as: Tag = "div", className = "", children, ...props }) {
  return (
    <Tag
      className={`rounded-[10px] border border-line bg-panel ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
