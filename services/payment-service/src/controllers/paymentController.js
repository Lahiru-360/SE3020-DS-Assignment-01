import { validationResult } from 'express-validator';
import {
  createPaymentIntentService,
  confirmPaymentService,
  refundPaymentService,
  getPaymentByAppointmentService,
  getMyPaymentsService,
  handleWebhookService,
} from '../services/paymentService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

// ─── Create Payment Intent ─────────────────────────────────────────────────
// POST /api/payments/create-intent
// Protected — patient only.
// Returns a Stripe clientSecret the frontend uses to render the card form.
export const createPaymentIntent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const data = await createPaymentIntentService(req.body);
    return sendSuccess(res, data, 'Payment intent created successfully', 201);
  } catch (e) {
    next(e);
  }
};

// ─── Confirm Payment ───────────────────────────────────────────────────────
// POST /api/payments/confirm
// Called by the frontend after stripe.confirmCardPayment() succeeds.
// Verifies with Stripe and marks payment as completed.
export const confirmPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const data = await confirmPaymentService(req.body.paymentIntentId);
    return sendSuccess(res, data, 'Payment confirmed successfully', 200);
  } catch (e) {
    next(e);
  }
};

// ─── Refund Payment ────────────────────────────────────────────────────────
// POST /api/payments/refund
// Issues a full Stripe refund and cancels the linked appointment.
export const refundPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const data = await refundPaymentService(req.body.paymentId);
    return sendSuccess(res, data, 'Refund issued successfully', 200);
  } catch (e) {
    next(e);
  }
};

// ─── Get Payment By Appointment ────────────────────────────────────────────
// GET /api/payments/appointment/:appointmentId
// Fetch the payment record for a specific appointment.
export const getPaymentByAppointment = async (req, res, next) => {
  try {
    const data = await getPaymentByAppointmentService(req.params.appointmentId);
    return sendSuccess(res, data, 'Payment retrieved successfully', 200);
  } catch (e) {
    next(e);
  }
};

// ─── Get My Payments ───────────────────────────────────────────────────────
// GET /api/payments/my-payments
// Returns all payment records for the currently authenticated patient.
// patientId is injected by the API Gateway as x-user-id header after JWT verification.
export const getMyPayments = async (req, res, next) => {
  try {
    const patientId = req.headers['x-user-id'];
    if (!patientId) return sendError(res, 'Unauthorized', 401);

    const data = await getMyPaymentsService(patientId);
    return sendSuccess(res, data, 'Payment history retrieved successfully', 200);
  } catch (e) {
    next(e);
  }
};

// ─── Stripe Webhook ────────────────────────────────────────────────────────
// POST /api/payments/webhook
// Called directly by Stripe (NOT by the frontend or API Gateway).
// Must receive the RAW request body (not JSON-parsed) to verify signature.
export const stripeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) return sendError(res, 'Missing stripe-signature header', 400);

    // req.body here is a raw Buffer — set up in app.js with express.raw()
    const data = await handleWebhookService(req.body, signature);
    return sendSuccess(res, data, 'Webhook processed', 200);
  } catch (e) {
    next(e);
  }
};
