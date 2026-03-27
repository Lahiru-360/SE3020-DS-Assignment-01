// ─────────────────────────────────────────────────────
// Gateway config — only includes services that have
// been built and registered. Add new service URLs here
// as each service is implemented.
// ─────────────────────────────────────────────────────

export const config = Object.freeze({
  PORT:             process.env.PORT || 5000,
  JWT_SECRET:       process.env.JWT_SECRET,
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
});
