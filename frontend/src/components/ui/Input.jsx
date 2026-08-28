import { useId } from "react";

export const fieldClasses =
  "w-full rounded-[10px] border bg-panel text-body text-ink placeholder:text-faint " +
  "shadow-[inset_0_1px_2px_rgba(18,33,31,0.04)] transition-[border-color,box-shadow] duration-200 " +
  "focus:outline-none focus:ring-4 focus:ring-brand/10";

export default function Input({
  label,
  hint,
  error,
  icon: Icon,
  type = "text",
  className = "",
  ...props
}) {
  const id = useId();
  const describedBy = hint || error ? `${id}-note` : undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-small font-medium text-ink">
          {label}
        </label>
      )}

      <div className="relative mt-2">
        {Icon && (
          <Icon
            size={16}
            strokeWidth={2}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
          />
        )}
        <input
          id={id}
          type={type}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={`${fieldClasses} h-11 ${Icon ? "pl-10" : "pl-3.5"} pr-3.5 ${
            error
              ? "border-accent focus:border-accent focus:ring-accent/10"
              : "border-line hover:border-line-strong focus:border-brand"
          }`}
          {...props}
        />
      </div>

      {(hint || error) && (
        <p
          id={`${id}-note`}
          className={`mt-2 text-small ${error ? "text-accent" : "text-muted"}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
