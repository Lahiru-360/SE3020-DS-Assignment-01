import { useEffect, useRef } from "react";

/**
 * ConfirmDialog — themed confirmation modal.
 *
 * Props:
 *   open        boolean          – whether the dialog is visible
 *   icon        "warning"|"danger"|"info"  – icon + accent colour
 *   title       string           – bold heading
 *   message     string|ReactNode – body text
 *   confirmLabel string          – text on the confirm button  (default "Confirm")
 *   cancelLabel  string          – text on the cancel button   (default "Cancel")
 *   loading     boolean          – disables buttons + shows spinner on confirm btn
 *   onConfirm   () => void       – called when user clicks the confirm button
 *   onCancel    () => void       – called when user clicks cancel or the backdrop
 */

const ICON_CONFIG = {
  danger: {
    bg: "rgba(231, 76, 60, 0.12)",
    border: "var(--color-error, #e74c3c)",
    color: "var(--color-error, #e74c3c)",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  warning: {
    bg: "rgba(244, 167, 50, 0.12)",
    border: "var(--color-warning, #f4a732)",
    color: "var(--color-warning, #f4a732)",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  info: {
    bg: "rgba(59, 130, 246, 0.12)",
    border: "var(--color-primary, #3b82f6)",
    color: "var(--color-primary, #3b82f6)",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

export default function ConfirmDialog({
  open,
  icon = "danger",
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  // Focus the cancel button on open so Escape/Tab work naturally
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape" && !loading) onCancel?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const cfg = ICON_CONFIG[icon] ?? ICON_CONFIG.danger;

  const isDestructive = icon === "danger";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border shadow-2xl"
        style={{
          background: "var(--color-bg-card, #1e2535)",
          borderColor: "var(--color-border, rgba(255,255,255,0.08))",
          animation: "confirmSlideIn 0.18s ease-out",
        }}
      >
        {/* Icon + Title */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center gap-4 text-center">
          {/* Icon circle */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center border"
            style={{
              background: cfg.bg,
              borderColor: cfg.border,
              color: cfg.color,
            }}
          >
            {cfg.svg}
          </div>

          <div>
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-text-primary"
            >
              {title}
            </h2>
            {message && (
              <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4">
          {/* Cancel — always first so it gets default focus */}
          <button
            ref={confirmRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-bg-main disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>

          {/* Confirm */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              background: isDestructive
                ? "var(--color-error, #e74c3c)"
                : "var(--color-primary, #3b82f6)",
            }}
          >
            {loading && (
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeOpacity="0.25"
                />
                <path
                  d="M12 2a10 10 0 010 20"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes confirmSlideIn {
          from { opacity: 0; transform: scale(0.93) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}
