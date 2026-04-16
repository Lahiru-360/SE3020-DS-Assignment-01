import { validationResult } from 'express-validator';
import {
  createPaymentIntentService,
  handleWebhookService,
  getMyTransactionsService,
  refundPaymentService,
} from '../services/paymentService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-intent
// Patient initiates a payment for their appointment.
// Returns clientSecret (used by Stripe.js on the frontend).
// ─────────────────────────────────────────────────────────────────────────────
export const createPaymentIntent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const patientId = req.headers['x-user-id'];
    if (!patientId) return sendError(res, 'Unauthorized', 401);

    const { appointmentId } = req.body;

    const result = await createPaymentIntentService({ appointmentId, patientId });

    return sendSuccess(res, result, 'Payment intent created', 201);
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// Called directly by Stripe — NOT by the patient browser.
//
// CRITICAL requirements:
//   1. This route must use express.raw({ type: 'application/json' }) body parser
//      (configured in app.js BEFORE express.json() is applied globally).
//   2. The Stripe-Signature header must be passed to the service for verification.
//   3. Always return HTTP 200 quickly — Stripe will retry if you return non-2xx.
// ─────────────────────────────────────────────────────────────────────────────
export const handleWebhook = async (req, res, next) => {
  try {
    const stripeSignature = req.headers['stripe-signature'];

    if (!stripeSignature) {
      return res.status(400).json({ success: false, message: 'Missing stripe-signature header', data: null });
    }

    // req.body is the RAW Buffer here (because app.js mounts raw body parser on this route)
    const result = await handleWebhookService(req.body, stripeSignature);

    // Always acknowledge immediately — Stripe expects a fast 200
    return res.status(200).json(result);
  } catch (e) {
    // Return 400 for bad signature, 500 for other errors
    // Stripe will retry on non-2xx so be specific
    const statusCode = e.statusCode === 400 ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: e.message,
      data: null,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/my
// Patient views their complete payment/transaction history.
// ─────────────────────────────────────────────────────────────────────────────
export const getMyTransactions = async (req, res, next) => {
  try {
    const patientId = req.headers['x-user-id'];
    if (!patientId) return sendError(res, 'Unauthorized', 401);

    const transactions = await getMyTransactionsService(patientId);
    return sendSuccess(res, transactions, 'Transactions fetched');
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/refund/:appointmentId (Admin)
// POST /api/payments/internal/refund/:appointmentId (Internal)
// ─────────────────────────────────────────────────────────────────────────────
export const refundPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const { appointmentId } = req.params;
    const result = await refundPaymentService(appointmentId);

    return sendSuccess(res, result, 'Refund initiated successfully');
  } catch (e) {
    next(e);
  }
};

export const refundPaymentInternal = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const result = await refundPaymentService(appointmentId);

    return sendSuccess(res, result, 'Internal refund processed');
  } catch (e) {
    next(e);
  }
};
