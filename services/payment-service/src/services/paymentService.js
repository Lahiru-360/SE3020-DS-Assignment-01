import Stripe from 'stripe';
import axios from 'axios';
import {
  createPayment,
  findPaymentByIntentId,
  findPaymentByAppointmentId,
  updatePaymentByIntentId,
  updatePaymentByAppointmentId,
} from '../repositories/paymentRepository.js';
import { createHttpError } from '../utils/httpError.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Internal call helper ───────────────────────────────────────────────────
const internalHeaders = () => ({ 'x-internal-secret': process.env.INTERNAL_SECRET });

// ─── Initiate a Stripe PaymentIntent ────────────────────────────────────────
// Called by appointment-service during booking.
// Creates a Stripe PaymentIntent and persists a Payment record.
// Returns: { stripeClientSecret, paymentIntentId, status, appointmentId }
export const initiatePaymentService = async ({
  appointmentId,
  patientId,
  doctorId,
  amount,
  currency,
  description,
}) => {
  try {
    // Create PaymentIntent on Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      metadata: {
        appointmentId,
        patientId,
        doctorId,
      },
      description,
    });

    // Persist Payment record
    const payment = await createPayment({
      appointmentId,
      patientId,
      doctorId,
      amount,
      currency,
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      status: 'pending',
      description,
    });

    return {
      stripeClientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: 'pending',
      appointmentId,
    };
  } catch (err) {
    console.error('Payment initiation error:', err);
    throw createHttpError('Failed to initiate payment', 500);
  }
};

// ─── Handle Stripe webhook ──────────────────────────────────────────────────
// Stripe calls this endpoint after payment completion/failure.
// We verify the signature, then update the Payment record and sync to appointment-service.
export const handleStripeWebhookService = async (rawBody, signature) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    throw createHttpError('Invalid webhook signature', 401);
  }

  // Handle payment intent completion
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;

    // Update Payment record
    const payment = await updatePaymentByIntentId(paymentIntent.id, {
      status: 'completed',
      completedAt: new Date(),
    });

    if (!payment) {
      throw createHttpError('Payment record not found', 404);
    }

    // Notify appointment-service to mark appointment as confirmed
    try {
      await axios.patch(
        `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/internal/payment-status`,
        {
          stripePaymentIntentId: paymentIntent.id,
          paymentStatus: 'completed',
        },
        { headers: internalHeaders() }
      );
    } catch (err) {
      console.error('Failed to sync payment status to appointment-service:', err.message);
      // Don't throw — payment was confirmed; sync failure should not block webhook response
    }

    return payment;
  }

  // Handle payment intent failure
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;

    // Update Payment record
    const payment = await updatePaymentByIntentId(paymentIntent.id, {
      status: 'failed',
    });

    if (!payment) {
      throw createHttpError('Payment record not found', 404);
    }

    // Notify appointment-service
    try {
      await axios.patch(
        `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/internal/payment-status`,
        {
          stripePaymentIntentId: paymentIntent.id,
          paymentStatus: 'failed',
        },
        { headers: internalHeaders() }
      );
    } catch (err) {
      console.error('Failed to sync payment status to appointment-service:', err.message);
    }

    return payment;
  }

  return { message: 'Event type not handled' };
};

// ─── Issue a refund ─────────────────────────────────────────────────────────
// Called by appointment-service when cancelling an appointment.
// Issues a Stripe refund and updates the Payment record.
export const refundPaymentService = async (appointmentId) => {
  // Find Payment record by appointmentId
  const payment = await findPaymentByAppointmentId(appointmentId);

  if (!payment) {
    throw createHttpError('Payment record not found for this appointment', 404);
  }

  try {
    // Issue Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
    });

    // Update Payment record
    const updated = await updatePaymentByAppointmentId(appointmentId, {
      status: 'refunded',
      stripeRefundId: refund.id,
      refundedAt: new Date(),
    });

    return updated;
  } catch (err) {
    console.error('Refund error:', err);
    throw createHttpError('Failed to process refund', 500);
  }
};

// ─── Get payment by intent ID ────────────────────────────────────────────────
export const getPaymentByIntentIdService = async (stripePaymentIntentId) => {
  const payment = await findPaymentByIntentId(stripePaymentIntentId);
  if (!payment) {
    throw createHttpError('Payment not found', 404);
  }
  return payment;
};

// ─── Get payment by appointment ID ──────────────────────────────────────────
export const getPaymentByAppointmentIdService = async (appointmentId) => {
  const payment = await findPaymentByAppointmentId(appointmentId);
  if (!payment) {
    throw createHttpError('Payment not found for this appointment', 404);
  }
  return payment;
};
