// ─────────────────────────────────────────────────────────────────────────────
// Notification Routes
//
// All routes here are INTERNAL ONLY — never exposed via API Gateway.
// Every request must include the "internal-secret" header.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { sendNotification } from '../controllers/notificationController.js';
import { internalAuth } from '../middleware/internalAuth.js';
import { sendNotificationValidators } from '../validators/notificationValidators.js';

const router = Router();

// POST /api/notifications/send — called by appointment-service
router.post('/send', internalAuth, sendNotificationValidators, sendNotification);

export default router;
