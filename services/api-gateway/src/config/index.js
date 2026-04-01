// ─────────────────────────────────────────────────────
// Gateway config — only includes services that have
// been built and registered. Add new service URLs here
// as each service is implemented.
// ─────────────────────────────────────────────────────

export const config = Object.freeze({
  PORT:                process.env.PORT || 5000,
  JWT_SECRET:          process.env.JWT_SECRET,
  AUTH_SERVICE_URL:    process.env.AUTH_SERVICE_URL,
  PATIENT_SERVICE_URL: process.env.PATIENT_SERVICE_URL,
  PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL,
});
