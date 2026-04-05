import {
  initiatePaymentService,
  handleStripeWebhookService,
  refundPaymentService,
  getPaymentByIntentIdService,
  getPaymentByAppointmentIdService,
} from '../services/paymentService.js';
import { sendSuccess } from '../utils/responseHelper.js';

// POST /api/payments/internal/initiate
// Called by appointment-service during booking
export const initiatePayment = async (req, res, next) => {
  try {
    const { appointmentId, patientId, doctorId, amount, currency, description } = req.body;

    const payment = await initiatePaymentService({
      appointmentId,
      patientId,
      doctorId,
      amount,
      currency,
      description,
    });

    return sendSuccess(res, payment, 'Payment initiated', 201);
  } catch (e) {
    next(e);
  }
};

// POST /api/payments/stripe-webhook
// Called by Stripe (external, public)
export const stripeWebhook = async (req, res, next) => {
  try {
    const signature = req.get('stripe-signature');
    const result = await handleStripeWebhookService(req.rawBody, signature);
    return sendSuccess(res, result, 'Webhook received');
  } catch (e) {
    next(e);
  }
};

// POST /api/payments/internal/refund
// Called by appointment-service when cancelling appointment
export const refundPayment = async (req, res, next) => {
  try {
    const { appointmentId } = req.body;

    const payment = await refundPaymentService(appointmentId);

    return sendSuccess(res, payment, 'Refund processed');
  } catch (e) {
    next(e);
  }
};

// GET /api/payments/:intentId
// Internal query (used for admin/reporting)
export const getByIntentId = async (req, res, next) => {
  try {
    const { intentId } = req.params;

    const payment = await getPaymentByIntentIdService(intentId);

    return sendSuccess(res, payment);
  } catch (e) {
    next(e);
  }
};

// GET /api/payments/appointment/:id
// Internal query by appointment ID
export const getByAppointmentId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await getPaymentByAppointmentIdService(id);

    return sendSuccess(res, payment);
  } catch (e) {
    next(e);
  }
};
