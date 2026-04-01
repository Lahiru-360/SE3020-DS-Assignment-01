import Stripe from 'stripe';
import axios from 'axios';

import {
  createPayment,
  findPaymentByIntentId,
  findPaymentById,
  findPaymentByAppointmentId,
  findPaymentsByPatientId,
  savePayment,
} from '../repositories/paymentRepository.js';
import { createHttpError } from '../utils/httpError.js';
import { config } from '../config/index.js';

// Initialise the Stripe client with the secret key.
// All Stripe API calls go through this single instance.
const stripe = new Stripe(config.STRIPE_SECRET_KEY);

// ─── Private helpers ───────────────────────────────────────────────────────

// Strips the client secret from payment records before sending to clients.
// clientSecret is only returned once — at intent creation.
const sanitisePayment = (payment) => {
  const obj = payment.toObject ? payment.toObject() : { ...payment };
  delete obj.stripeClientSecret;
  return obj;
};

// Notifies appointment-service to update appointment status.
// Best-effort — a failure here logs but does NOT undo the payment record.
const notifyAppointmentService = async (appointmentId, status) => {
  if (!config.APPOINTMENT_SERVICE_URL) return;
  try {
    await axios.patch(
      `${config.APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}/status`,
      { status }
    );
  } catch (err) {
    console.error(
      `Payment Service: Failed to notify appointment-service for ${appointmentId}:`,
      err.message
    );
  }
};

// ─── Public service functions ──────────────────────────────────────────────

/**
 * createPaymentIntentService
 *
 * 1. Creates a Stripe PaymentIntent (server-side).
 * 2. Stores a pending payment record in MongoDB.
 * 3. Returns the clientSecret so the frontend can complete payment via Stripe.js.
 *
 * Frontend flow after receiving clientSecret:
 *   stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } })
 */
export const createPaymentIntentService = async ({
  appointmentId,
  patientId,
  doctorId,
  amount,
  currency = 'usd',
  description = null,
}) => {
  // Prevent duplicate payment intents for the same appointment.
  const existing = await findPaymentByAppointmentId(appointmentId);
  if (existing) {
    throw createHttpError(
      'A payment already exists for this appointment. Use /confirm or /refund.',
      409
    );
  }

  // Create PaymentIntent on Stripe — this does NOT charge the card yet.
  // The charge only happens when the frontend calls stripe.confirmCardPayment.
  const intent = await stripe.paymentIntents.create({
    amount,          // must be in smallest unit (e.g. cents)
    currency,
    metadata: {
      appointmentId,
      patientId,
      doctorId,
    },
    description: description || `Appointment payment — ${appointmentId}`,
  });

  // Persist the payment record locally so we can track status.
  const payment = await createPayment({
    appointmentId,
    patientId,
    doctorId,
    amount,
    currency,
    status: 'pending',
    stripePaymentIntentId: intent.id,
    stripeClientSecret:    intent.client_secret,
    description,
  });

  // Return the clientSecret — the frontend needs this to render the Stripe card form.
  return {
    paymentId:    payment._id,
    clientSecret: intent.client_secret,
    amount,
    currency,
    status:       payment.status,
  };
};

/**
 * confirmPaymentService
 *
 * Called AFTER the frontend successfully confirms the card payment with Stripe.
 * Verifies the intent status via Stripe API, then updates our DB record
 * and asks appointment-service to mark the appointment as 'confirmed'.
 */
export const confirmPaymentService = async (paymentIntentId) => {
  // Fetch the intent from Stripe to check real status.
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  const payment = await findPaymentByIntentId(paymentIntentId);
  if (!payment) throw createHttpError('Payment record not found', 404);

  if (intent.status === 'succeeded') {
    payment.status = 'completed';
    await savePayment(payment);

    // Tell appointment-service the appointment is now confirmed.
    await notifyAppointmentService(payment.appointmentId, 'confirmed');

    return sanitisePayment(payment);
  }

  if (intent.status === 'payment_failed') {
    payment.status = 'failed';
    await savePayment(payment);
    throw createHttpError('Payment failed. Please try again.', 402);
  }

  // Any other status (processing, requires_action, etc.) — still pending.
  throw createHttpError(
    `Payment is not yet complete. Stripe status: ${intent.status}`,
    400
  );
};

/**
 * refundPaymentService
 *
 * Issues a full refund via Stripe for a completed payment.
 * Updates our DB record to 'refunded' and tells appointment-service
 * to cancel the appointment.
 */
export const refundPaymentService = async (paymentId) => {
  const payment = await findPaymentById(paymentId);
  if (!payment) throw createHttpError('Payment not found', 404);

  if (payment.status !== 'completed') {
    throw createHttpError(
      `Cannot refund a payment with status '${payment.status}'. Only completed payments can be refunded.`,
      400
    );
  }

  // Issue refund on Stripe.
  const refund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
  });

  payment.status = 'refunded';
  payment.stripeRefundId = refund.id;
  await savePayment(payment);

  // Tell appointment-service the appointment is cancelled due to refund.
  await notifyAppointmentService(payment.appointmentId, 'cancelled');

  return sanitisePayment(payment);
};

/**
 * getPaymentByAppointmentService
 * Returns the payment record for a given appointment (sanitised — no clientSecret).
 */
export const getPaymentByAppointmentService = async (appointmentId) => {
  const payment = await findPaymentByAppointmentId(appointmentId);
  if (!payment) throw createHttpError('No payment found for this appointment', 404);
  return sanitisePayment(payment);
};

/**
 * getMyPaymentsService
 * Returns all payment records for the authenticated patient (most recent first).
 */
export const getMyPaymentsService = async (patientId) => {
  const payments = await findPaymentsByPatientId(patientId);
  return payments.map(sanitisePayment);
};

/**
 * handleWebhookService
 *
 * Processes Stripe webhook events (e.g. payment_intent.succeeded).
 * The raw request body (Buffer) and Stripe-Signature header are required
 * to validate the webhook signature — this prevents spoofed events.
 *
 * This is an ALTERNATIVE/BACKUP to the manual /confirm endpoint.
 * Stripe will call this automatically when a payment succeeds or fails.
 */
export const handleWebhookService = async (rawBody, signature) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw createHttpError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  const intent = event.data.object;

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const payment = await findPaymentByIntentId(intent.id);
      if (payment && payment.status !== 'completed') {
        payment.status = 'completed';
        await savePayment(payment);
        await notifyAppointmentService(payment.appointmentId, 'confirmed');
        console.log(`Payment Service: Webhook — payment completed for appointment ${payment.appointmentId}`);
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const payment = await findPaymentByIntentId(intent.id);
      if (payment && payment.status === 'pending') {
        payment.status = 'failed';
        await savePayment(payment);
        console.log(`Payment Service: Webhook — payment failed for appointment ${payment.appointmentId}`);
      }
      break;
    }
    default:
      console.log(`Payment Service: Unhandled webhook event type: ${event.type}`);
  }

  return { received: true };
};
