// ─────────────────────────────────────────────────────
// Payment Routes
//
// All routes below (except /webhook) are PROTECTED —
// the API Gateway applies verifyToken before forwarding.
// The authenticated user's ID is available as:
//   req.headers['x-user-id']
//   req.headers['x-user-role']
//
// /webhook is called directly by Stripe and must be
// registered with express.raw() body parsing (see app.js).
// ─────────────────────────────────────────────────────

import { Router } from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  refundPayment,
  getPaymentByAppointment,
  getMyPayments,
  stripeWebhook,
} from '../controllers/paymentController.js';
import {
  createPaymentIntentValidators,
  confirmPaymentValidators,
  refundPaymentValidators,
} from '../validators/paymentValidators.js';

const router = Router();

// ── Stripe Webhook — RAW body, no JWT (Stripe calls this directly) ─────────
router.post('/webhook', stripeWebhook);

// ── Patient endpoints ──────────────────────────────────────────────────────
// All protected — gateway injects x-user-id, x-user-role headers after JWT check.

// Step 1: Create a payment intent → get clientSecret for the frontend Stripe form
router.post('/create-intent', createPaymentIntentValidators, createPaymentIntent);

// Step 2: After frontend completes card entry with Stripe.js → confirm payment
router.post('/confirm', confirmPaymentValidators, confirmPayment);

// Refund a completed payment (doctor cancel / patient cancel)
router.post('/refund', refundPaymentValidators, refundPayment);

// Get payment for a specific appointment
router.get('/appointment/:appointmentId', getPaymentByAppointment);

// Get all payments for the currently logged-in patient
router.get('/my-payments', getMyPayments);

export default router;
