import { Link } from "react-router-dom";

/**
 * The JobMatch AI wordmark. A small filled square carrying the M gives it a
 * mark of its own without needing a logo file.
 */
export default function Wordmark({ to = "/", className = "" }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center rounded-[7px] bg-brand font-display
                   text-[1.05rem] font-semibold leading-none text-surface"
      >
        M
      </span>
      <span className="font-display text-[1.35rem] font-semibold leading-none text-ink">
        JobMatch<span className="text-accent"> AI</span>
      </span>
    </Link>
  );
}
