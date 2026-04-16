import { useState } from "react";
import { getOrCreateSession } from "../../api/telemedicineService";

// Video camera icon (inline SVG — no extra dependency)
function VideoCameraIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 8a2 2 0 012-2h7a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"
      />
    </svg>
  );
}

/**
 * TelemedicineButton — calls getOrCreateSession and opens the returned
 * joinUrl in a new tab.  The URL is role-specific: the backend embeds a
 * signed JaaS JWT that grants moderator rights to the doctor and
 * participant rights to the patient, so there is no client-side role
 * branching required.
 *
 * Props:
 *   appointmentId {string}  — MongoDB ObjectId of the appointment
 *   onError       {fn}      — called with an error string on failure
 *   size          "sm"|"md" — "sm" for card buttons, "md" for modal (default "sm")
 *   className     {string}  — optional override for the button class
 */
export default function TelemedicineButton({
  appointmentId,
  onError,
  size = "sm",
  className,
}) {
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    // Prevent parent card click from firing when button is inside a card
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await getOrCreateSession(appointmentId);
      const url = res.data?.data?.joinUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        onError?.("Session URL not available. Please try again.");
      }
    } catch (err) {
      onError?.(
        err.response?.data?.message ??
          "Failed to join session. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Default styles by size; caller can fully override via className
  const defaultClass =
    size === "md"
      ? "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      : "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity";

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={loading}
      style={{ backgroundColor: "var(--color-primary-soft)" }}
      className={className ?? defaultClass}
      aria-label="Join virtual consultation session"
    >
      {!loading && (
        <VideoCameraIcon
          className={
            size === "md" ? "h-4 w-4 shrink-0" : "h-3.5 w-3.5 shrink-0"
          }
        />
      )}
      {loading ? "Joining…" : "Join Session"}
    </button>
  );
}
