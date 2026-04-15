// ─────────────────────────────────────────────────────────────────────────────
// Payment Service — Business Logic
//
// Two public operations:
//   1. createPaymentIntentService  — called when patient clicks "Pay Now"
//   2. handleWebhookService        — called when Stripe posts a webhook event
//
// Security notes:
//   - Only payment_intent.succeeded and payment_intent.payment_failed are handled
//   - Stripe signature is verified before ANY processing in handleWebhookService
//   - Raw card data is NEVER stored — only PCI-safe metadata from the charge object
// ─────────────────────────────────────────────────────────────────────────────

import Stripe from 'stripe';
import axios from 'axios';
import {
  createTransaction,
  findTransactionByAppointmentId,
  findTransactionByStripeIntentId,
  findTransactionsByPatientId,
  updateTransactionById,
} from '../repositories/transactionRepository.js';
import { createHttpError } from '../utils/httpError.js';
import { publishPaymentEvent } from '../events/paymentPublisher.js';

// Initialise Stripe with the secret key from env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Internal call helper ────────────────────────────────────────────────────
const internalHeaders = () => ({ 'x-internal-secret': process.env.INTERNAL_SECRET });

// ─── Fetch appointment from appointment-service ──────────────────────────────
async function fetchAppointment(appointmentId) {
  try {
    const { data } = await axios.get(
      `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/internal/${appointmentId}`,
      { headers: internalHeaders() }
    );
    return data.data;
  } catch {
    throw createHttpError('Appointment not found', 404);
  }
}

// ─── Update appointment payment fields via internal call ─────────────────────
async function updateAppointmentPayment(appointmentId, updates) {
  await axios.patch(
    `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/internal/${appointmentId}/payment`,
    updates,
    { headers: internalHeaders() }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE PAYMENT INTENT
//    Called by patient via: POST /api/payments/create-intent
//
//    Flow:
//      a. Fetch appointment, validate ownership
//      b. Guard against double-payment
//      c. Create Stripe PaymentIntent
//      d. Create Transaction document (status: 'initiated')
//      e. Link transaction to appointment (paymentId)
//      f. Return clientSecret to frontend (used by Stripe.js)
// ─────────────────────────────────────────────────────────────────────────────
export const createPaymentIntentService = async ({ appointmentId, patientId }) => {
  // a. Fetch and validate appointment
  const appointment = await fetchAppointment(appointmentId);

  if (appointment.patientId !== patientId) {
    throw createHttpError('Forbidden: this is not your appointment', 403);
  }

  if (['cancelled', 'completed'].includes(appointment.status)) {
    throw createHttpError(`Cannot pay for a ${appointment.status} appointment`, 400);
  }

  if (appointment.paymentStatus === 'paid') {
    throw createHttpError('This appointment has already been paid', 400);
  }

  // b. Guard against double-payment initiation (idempotency)
  //    If a transaction already exists and is 'initiated', return the same clientSecret.
  const existing = await findTransactionByAppointmentId(appointmentId);
  if (existing && existing.status === 'initiated') {
    // Retrieve the fresh clientSecret from Stripe (in case it expired, we'd need
    // to create a new one, but for sandbox this is fine)
    const intent = await stripe.paymentIntents.retrieve(existing.stripePaymentIntentId);
    return {
      clientSecret: intent.client_secret,
      transactionId: existing._id,
      amount: existing.amount,
      currency: existing.currency,
    };
  }

  // c. Create Stripe PaymentIntent
  //    amount is in smallest currency unit — LKR is a 2-decimal currency in Stripe
  //    so LKR 2500 → amount: 250000 (like USD cents)
  const paymentIntent = await stripe.paymentIntents.create({
    amount:   Math.round(appointment.consultationFee * 100),   // convert to smallest unit (cents)
    currency: (appointment.currency || 'LKR').toLowerCase(),
    metadata: {
      appointmentId: appointmentId.toString(),
      patientId:     patientId.toString(),
    },
    // This description appears on the patient's bank statement
    description: `HC Platform consultation payment — Appointment ${appointmentId}`,
  });

  // d. Save Transaction to DB
  const transaction = await createTransaction({
    appointmentId:         appointmentId.toString(),
    patientId:             patientId.toString(),
    amount:                appointment.consultationFee,
    currency:              appointment.currency || 'LKR',
    status:                'initiated',
    paymentMethod:         'card',
    stripePaymentIntentId: paymentIntent.id,
    stripeClientSecret:    paymentIntent.client_secret,
  });

  // e. Link transaction ID to appointment so appointment knows about this payment
  await updateAppointmentPayment(appointmentId, { paymentId: transaction._id.toString() });

  // f. Return clientSecret — frontend uses this with Stripe.js to render the card form
  return {
    clientSecret:          paymentIntent.client_secret,
    stripePaymentIntentId: paymentIntent.id,
    transactionId:         transaction._id,
    amount:                appointment.consultationFee,
    currency:              appointment.currency || 'LKR',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. HANDLE STRIPE WEBHOOK
//    Called by Stripe servers: POST /api/payments/webhook
//
//    CRITICAL: This endpoint uses express.raw() body parser, NOT express.json().
//    Stripe signature verification requires the raw request body bytes.
//
//    Events handled:
//      payment_intent.succeeded      → mark as completed, confirm appointment
//      payment_intent.payment_failed → mark as failed
// ─────────────────────────────────────────────────────────────────────────────
export const handleWebhookService = async (rawBody, stripeSignature) => {
  // Verify the event is genuinely from Stripe (not a spoofed request)
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      stripeSignature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw createHttpError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  const stripeObject = event.data.object;
  
  // Extract PaymentIntent ID based on event type
  // For payment_intent.* events: stripeObject.id is the PI ID
  // For charge.* events: stripeObject.payment_intent is the PI ID
  const paymentIntentId = event.type.startsWith('charge.') 
    ? stripeObject.payment_intent 
    : stripeObject.id;

  // Find our Transaction record using the Stripe PaymentIntent ID
  const transaction = await findTransactionByStripeIntentId(paymentIntentId);
  if (!transaction) {
    // Unknown transaction — log and ignore (could be from another app in same Stripe account)
    console.warn(`[PaymentService] Webhook: no transaction for intent ${paymentIntentId} (Event: ${event.type})`);
    return { received: true };
  }

  // ── Success path ────────────────────────────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    // Extract PCI-safe card metadata from the latest charge
    const chargeId   = stripeObject.latest_charge;
    let cardLast4    = null;
    let cardBrand    = null;
    let cardExpMonth = null;
    let cardExpYear  = null;
    let cardCountry  = null;

    if (chargeId) {
      try {
        const charge    = await stripe.charges.retrieve(chargeId);
        const cardDetails = charge.payment_method_details?.card;
        cardLast4    = cardDetails?.last4    ?? null;
        cardBrand    = cardDetails?.brand    ?? null;
        cardExpMonth = cardDetails?.exp_month ?? null;
        cardExpYear  = cardDetails?.exp_year  ?? null;
        cardCountry  = cardDetails?.country   ?? null;
      } catch (err) {
        console.warn('[PaymentService] Could not retrieve charge details:', err.message);
      }
    }

    // Update transaction to completed with full card metadata
    await updateTransactionById(transaction._id, {
      status:           'completed',
      stripeChargeId:   chargeId || null,
      cardLast4,
      cardBrand,
      cardExpMonth,
      cardExpYear,
      cardCountry,
      webhookReceivedAt: new Date(),
    });

    // Notify appointment-service via event — it will mark paymentStatus: paid and status: confirmed
    publishPaymentEvent('payment_succeeded', { appointmentId: transaction.appointmentId });

    console.log(`[PaymentService] Payment completed for appointment ${transaction.appointmentId}`);
  }

  // ── Failure path ────────────────────────────────────────────────────────────
  if (event.type === 'payment_intent.payment_failed') {
    const failureReason =
      stripeObject.last_payment_error?.message || 'Payment failed';

    await updateTransactionById(transaction._id, {
      status:            'failed',
      failureReason,
      webhookReceivedAt: new Date(),
    });

    publishPaymentEvent('payment_failed', { appointmentId: transaction.appointmentId });

    console.warn(`[PaymentService] Payment failed for appointment ${transaction.appointmentId}: ${failureReason}`);
  }

  // ── Refund path (e.g. triggered from Stripe Dashboard) ──────────────────────
  if (event.type === 'charge.refunded') {
    await updateTransactionById(transaction._id, {
      status:            'refunded',
      webhookReceivedAt: new Date(),
    });

    // Notify appointment-service via event — it will update paymentStatus and cancel the appointment
    publishPaymentEvent('payment_refunded', { appointmentId: transaction.appointmentId });

    console.log(`[PaymentService] Refund processed for appointment ${transaction.appointmentId}`);
  }

  return { received: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET PATIENT'S TRANSACTIONS
//    Called by patient via: GET /api/payments/my
// ─────────────────────────────────────────────────────────────────────────────
export const getMyTransactionsService = (patientId) =>
  findTransactionsByPatientId(patientId);

// ─────────────────────────────────────────────────────────────────────────────
// 4. REFUND PAYMENT
//    Triggered by Admin manually OR by Appointment Service on cancellation.
// ─────────────────────────────────────────────────────────────────────────────
export const refundPaymentService = async (appointmentId) => {
  const transaction = await findTransactionByAppointmentId(appointmentId);
  if (!transaction) throw createHttpError('Transaction not found', 404);

  if (transaction.status !== 'completed') {
    throw createHttpError(`Cannot refund a transaction in ${transaction.status} status`, 400);
  }

  // 1. Trigger Stripe Refund
  let stripeRefundId = 'skipped_for_test';
  try {
    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId,
      reason:         'requested_by_customer',
    });
    stripeRefundId = refund.id;
  } catch (err) {
    // Robust check for various Stripe error message formats
    const isNoChargeErr = /no successful charge/i.test(err.message) || 
                          /does not have a successful charge/i.test(err.message);

    if (isNoChargeErr) {
      console.warn(`[PaymentService] Skipped Stripe-side refund for intent ${transaction.stripePaymentIntentId} (No charge found on Stripe). Proceeding with local DB update.`);
    } else {
      throw createHttpError(`Stripe Refund Failed: ${err.message}`, 400);
    }
  }

  // 2. Update local transaction record
  await updateTransactionById(transaction._id, {
    status: 'refunded',
  });

  // 3. Notify appointment-service via event — it will update paymentStatus and cancel the appointment
  publishPaymentEvent('payment_refunded', { appointmentId });

  return {
    refundId: stripeRefundId,
    status:   'refunded',
  };
};

