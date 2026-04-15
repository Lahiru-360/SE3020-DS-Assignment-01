// ─────────────────────────────────────────────────────────────────────────────
// Payment Routes
//
// All routes prefixed with /api/payments (mounted in app.js).
//
// Route summary:
//   POST /create-intent  → patient initiates payment (JWT verified at Gateway)
//   POST /webhook        → Stripe webhook (NO JWT — called by Stripe servers)
//   GET  /my             → patient views own transaction history
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import {
  createPaymentIntent,
  handleWebhook,
  getMyTransactions,
  refundPayment,
  refundPaymentInternal,
} from '../controllers/paymentController.js';
import { createPaymentIntentValidators } from '../validators/paymentValidators.js';

const router = Router();

// Stripe webhook — must be mounted BEFORE express.json() body parser.
// The raw body parser is applied exclusively to this route in app.js.
router.post('/webhook', handleWebhook);

// Patient-facing routes (JWT verified + role enforced at Gateway level)
router.post('/create-intent', createPaymentIntentValidators, createPaymentIntent);
router.get('/my', getMyTransactions);

// Refund routes
router.post('/refund/:appointmentId',          refundPayment); // Admin manually triggers
router.post('/internal/refund/:appointmentId', refundPaymentInternal);        // Service-to-service call

export default router;
