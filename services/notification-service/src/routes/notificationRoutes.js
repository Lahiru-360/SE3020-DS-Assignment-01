// ─────────────────────────────────────────────────────────────────────────────
// Notification Routes
//
// All routes are INTERNAL ONLY — never exposed through the API Gateway.
// Every request must include the "x-internal-secret" header.
// Accessible by any internal service: appointment, auth, doctor, patient, etc.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { sendNotification, getNotifications } from '../controllers/notificationController.js';
import { internalAuth } from '../middleware/internalAuth.js';
import { sendNotificationValidators } from '../validators/notificationValidators.js';

const router = Router();

// POST /api/notifications/send
// Send an email and/or SMS notification from any internal service.
router.post('/send', internalAuth, sendNotificationValidators, sendNotification);

// GET /api/notifications?email=...&type=...&source=...
// Query past notification logs (at least one query param required).
router.get('/', internalAuth, getNotifications);

export default router;
