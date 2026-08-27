import { useId } from "react";

/**
 * A labelled input. The label is always present rather than a placeholder
 * standing in for one, because placeholder-only fields are hard to use once
 * they contain text.
 */
export default function Input({
  label,
  hint,
  error,
  type = "text",
  className = "",
  ...props
}) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>

      <input
        id={id}
        type={type}
        className={`mt-2 h-11 w-full rounded-[8px] border bg-panel px-3 text-[0.95rem]
          text-ink placeholder:text-muted/60 transition-colors
          focus:outline-none focus:ring-2 focus:ring-brand/25
          ${error ? "border-accent focus:border-accent" : "border-line focus:border-brand"}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={hint || error ? `${id}-note` : undefined}
        {...props}
      />

      {(hint || error) && (
        <p
          id={`${id}-note`}
          className={`mt-2 text-sm ${error ? "text-accent" : "text-muted"}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
