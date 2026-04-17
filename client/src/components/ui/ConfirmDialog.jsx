import { AlertTriangle } from "lucide-react";

/**
 * A reusable confirmation dialog modal.
 *
 * Props:
 *  - open        {boolean}   — controls visibility
 *  - title       {string}    — heading text
 *  - message     {string}    — body text
 *  - confirmLabel {string}   — confirm button label (default "Confirm")
 *  - cancelLabel  {string}   — cancel button label  (default "Cancel")
 *  - onConfirm   {function}  — called when user confirms
 *  - onCancel    {function}  — called when user cancels or clicks backdrop
 *  - danger      {boolean}   — styles confirm button in red (default true)
 */
export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger = true,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-bg-card border border-border shadow-xl p-6 space-y-4">
        {/* Icon + Title */}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            {message && (
              <p className="mt-1 text-sm text-text-muted">{message}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-bg-main transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
