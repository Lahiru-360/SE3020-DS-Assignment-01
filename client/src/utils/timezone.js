// ── Timezone utilities ────────────────────────────────────────────────────────
//
// The app timezone is controlled by the VITE_TIMEZONE env variable.
// Defaults to Asia/Colombo (Sri Lanka, UTC+5:30).
// To change it, set VITE_TIMEZONE in client/.env, e.g.:
//   VITE_TIMEZONE=America/New_York
//
// Why this matters:
//   new Date().toISOString() always returns UTC.  If the server is UTC+5:30
//   and it is 00:15 LKT on April 17, toISOString() gives "2026-04-16T…Z"
//   which makes the date picker treat yesterday as the minimum — allowing
//   past-date selections.  Using Intl.DateTimeFormat with the correct
//   timezone fixes this.

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
  // Build a Date at midnight today in the app timezone, then offset by n days.
  const todayStr = todayInTZ(); // "YYYY-MM-DD"
  const [y, m, d] = todayStr.split("-").map(Number);
  // Create a UTC date whose calendar date in the TZ equals today.
  // We don't need perfect TZ-aware midnight; we just need a stable reference.
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
