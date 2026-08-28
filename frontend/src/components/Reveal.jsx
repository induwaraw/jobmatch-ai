import { useReveal } from "../hooks/useMotion";

export default function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
  ...props
}) {
  const { ref, visible } = useReveal();

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      {...props}
    >
      {children}
    </Tag>
  );
}
