import { Link } from "react-router-dom";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "bg-brand text-surface shadow-[0_1px_2px_rgba(18,33,31,0.16)] hover:bg-brand-hover " +
    "hover:shadow-[0_4px_14px_-4px_rgba(15,61,62,0.5)]",
  secondary:
    "border border-line bg-panel text-ink shadow-[0_1px_2px_rgba(18,33,31,0.04)] " +
    "hover:border-line-strong hover:bg-brand-tint",
  accent:
    "bg-accent text-white shadow-[0_1px_2px_rgba(18,33,31,0.16)] hover:bg-accent-hover " +
    "hover:shadow-[0_4px_14px_-4px_rgba(194,87,27,0.5)]",
  ghost: "text-ink hover:bg-brand-soft/60",
  danger:
    "border border-accent/35 bg-accent-soft text-accent hover:border-accent/60 hover:bg-accent/10",
};

const sizes = {
  sm: "h-9 px-3.5 text-small",
  md: "h-11 px-5 text-body",
  lg: "h-12 px-6 text-[1rem]",
};

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
      <a className={classes} href={href} {...props}>
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
