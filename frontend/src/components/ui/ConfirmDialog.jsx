import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

import Button from "./Button";

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-draw-in w-full max-w-md rounded-[16px] border border-line bg-panel p-6 shadow-[0_24px_56px_-24px_rgba(18,33,31,0.4)] focus:outline-none sm:p-7"
      >
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft">
            <AlertTriangle size={20} strokeWidth={2} className="text-accent" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-title"
              className="font-display text-h3 font-semibold text-ink"
            >
              {title}
            </h2>
            <p className="mt-2 break-words text-body leading-relaxed text-muted">{body}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-faint transition-colors hover:bg-brand-soft/60 hover:text-ink"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant="accent" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
