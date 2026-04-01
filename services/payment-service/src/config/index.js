// ─────────────────────────────────────────────────────
// Payment Service config — reads from environment vars.
// All consumed env vars must also be listed in
// .env.example so teammates know what to set.
// ─────────────────────────────────────────────────────

export const config = Object.freeze({
  PORT:                    process.env.PORT || 5005,
  MONGO_URI:               process.env.MONGO_URI,
  STRIPE_SECRET_KEY:       process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET:   process.env.STRIPE_WEBHOOK_SECRET,
  APPOINTMENT_SERVICE_URL: process.env.APPOINTMENT_SERVICE_URL,
});
