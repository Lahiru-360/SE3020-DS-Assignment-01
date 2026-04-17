// ── Timezone utilities ────────────────────────────────────────────────────────
// Use app timezone consistently to avoid UTC date drift near midnight.

export const APP_TIMEZONE =
  import.meta.env.VITE_TIMEZONE || "Asia/Colombo";

/**
 * Returns the current date string "YYYY-MM-DD" in the app's timezone.
 */
export function todayInTZ() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Returns a "YYYY-MM-DD" string that is `n` calendar days after today
 * (relative to the app's timezone).
 */
export function addDaysInTZ(n) {
  const todayStr = todayInTZ(); // "YYYY-MM-DD"
  const [y, m, d] = todayStr.split("-").map(Number);
  // Use a stable UTC anchor, then format back in app timezone.
  const base = new Date(Date.UTC(y, m - 1, d + n));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

/**
 * Returns true if `dateStr` ("YYYY-MM-DD") is strictly before today
 * in the app's timezone.
 */
export function isPastDate(dateStr) {
  return dateStr < todayInTZ();
}

/**
 * Returns true if slot time ("HH:MM") is now or earlier in app timezone.
 * Returns false for missing/invalid values.
 */
export function isSlotElapsed(timeSlot) {
  if (!timeSlot) return false;
  const parts = timeSlot.split(":").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return false;
  const [h, m] = parts;
  const slotMinutes = h * 60 + m;

  // Current HH:MM in app timezone
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const nowH = Number(timeParts.find((p) => p.type === "hour").value);
  const nowM = Number(timeParts.find((p) => p.type === "minute").value);
  const nowMinutes = nowH * 60 + nowM;

  return slotMinutes <= nowMinutes; // slot has started or already passed
}
