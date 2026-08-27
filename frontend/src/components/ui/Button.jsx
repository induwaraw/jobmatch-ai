import { Link } from "react-router-dom";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[8px] font-medium " +
  "transition-colors duration-150 disabled:opacity-55 disabled:cursor-not-allowed";

const variants = {
  primary: "bg-brand text-surface hover:bg-brand-hover",
  // Border over shadow, in keeping with the rest of the interface
  secondary: "border border-line bg-panel text-ink hover:border-ink/30 hover:bg-brand-soft/40",
  accent: "bg-accent text-white hover:brightness-95",
  quiet: "text-ink hover:bg-brand-soft/60",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-12 px-6 text-base",
};

/**
 * Renders a button, or a router Link when `to` is given, so navigation and
 * actions look identical without duplicating the styles.
 */
export default function Button({
  variant = "primary",
  size = "md",
  to,
  href,
  className = "",
  children,
  ...props
}) {
  const classes = `${base} ${variants[variant] ?? variants.primary} ${
    sizes[size] ?? sizes.md
  } ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
