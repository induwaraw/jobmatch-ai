import { useReveal } from "../hooks/useMotion";

/**
 * Fades and lifts its children into view once, when scrolled to.
 * `delay` staggers siblings so a row of cards arrives in sequence.
 */
export default function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...props }) {
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
