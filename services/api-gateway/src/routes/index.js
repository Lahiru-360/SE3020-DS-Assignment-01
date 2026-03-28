// ─────────────────────────────────────────────────────
// API Gateway — Route Aggregator
//
// This file ONLY imports and mounts service routers.
// All routing logic lives in the per-service route file.
//
// To add a new downstream service:
//   1. Create  src/routes/<service>.routes.js
//   2. Add its URL to src/config/index.js
//   3. Add its URL to .env.example
//   4. Import and mount its router below
// ─────────────────────────────────────────────────────

import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { patientRouter } from './patient.routes.js';

const router = Router();

router.use(authRouter);
router.use(patientRouter);

export default router;
