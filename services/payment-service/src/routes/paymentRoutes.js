import { Router } from 'express';
import {
  initiatePayment,
  stripeWebhook,
  refundPayment,
  getByIntentId,
  getByAppointmentId,
} from '../controllers/paymentController.js';
import { internalAuth } from '../middleware/internalAuth.js';

const router = Router();

// ── Internal (service-to-service, protected by internalAuth) ──────────────────
router.post('/internal/initiate', internalAuth, initiatePayment);
router.post('/internal/refund', internalAuth, refundPayment);
router.get('/:intentId', internalAuth, getByIntentId);
router.get('/appointment/:id', internalAuth, getByAppointmentId);

// ── Public (Stripe webhook — signature verified by Stripe) ──────────────────
// NOTE: This route is added separately in app.js with raw body middleware
// router.post('/stripe-webhook', stripeWebhook);

export default router;
