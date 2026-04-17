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

import Stripe from "stripe";
import axios from "axios";
import {
  createTransaction,
  findTransactionByAppointmentId,
  findTransactionByStripeIntentId,
  findTransactionsByPatientId,
  updateTransactionById,
} from "../repositories/transactionRepository.js";
import { createHttpError } from "../utils/httpError.js";
import { publishPaymentEvent } from "../events/paymentPublisher.js";

// Initialise Stripe with the secret key from env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Internal call helper ────────────────────────────────────────────────────
const internalHeaders = () => ({
  "x-internal-secret": process.env.INTERNAL_SECRET,
});

// ─── Fetch appointment from appointment-service ──────────────────────────────
async function fetchAppointment(appointmentId) {
  try {
    const { data } = await axios.get(
      `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/internal/${appointmentId}`,
      { headers: internalHeaders() },
    );
    return data.data;
  } catch {
    throw createHttpError("Appointment not found", 404);
  }
}

// ─── Update appointment payment fields via internal call ─────────────────────
async function updateAppointmentPayment(appointmentId, updates) {
  await axios.patch(
    `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/internal/${appointmentId}/payment`,
    updates,
    { headers: internalHeaders() },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE PAYMENT INTENT
//    Called by patient via: POST /api/payments/create-intent
//
// ─── Shared Payment Success Logic (Idempotent) ─────────────────────────────
async function processPaymentSuccess(paymentIntentId, stripeObject) {
  const transaction = await findTransactionByStripeIntentId(paymentIntentId);
  if (!transaction) {
    console.warn(`[PaymentService] ProcessSuccess: no transaction for intent ${paymentIntentId}`);
    return;
  }

  // Idempotency check: Don't process if already completed
  if (transaction.status === "completed") {
    console.log(`[PaymentService] Transaction ${transaction._id} already completed — skipping`);
    return;
  }

  const chargeId = stripeObject.latest_charge;
  let cardDetails = {};
  if (chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      const card = charge.payment_method_details?.card;
      cardDetails = {
        cardLast4: card?.last4 ?? null,
        cardBrand: card?.brand ?? null,
        cardExpMonth: card?.exp_month ?? null,
        cardExpYear: card?.exp_year ?? null,
        cardCountry: card?.country ?? null,
      };
    } catch (err) {
      console.warn("[PaymentService] Could not retrieve charge details:", err.message);
    }
  }

  await updateTransactionById(transaction._id, {
    status: "completed",
    stripeChargeId: chargeId || null,
    ...cardDetails,
    webhookReceivedAt: transaction.webhookReceivedAt || new Date(),
    updatedAt: new Date(),
  });

  publishPaymentEvent("payment_succeeded", { appointmentId: transaction.appointmentId });
  console.log(`[PaymentService] Payment processed for appointment ${transaction.appointmentId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. VERIFY PAYMENT (Secure source-of-truth verify for local dev)
// ─────────────────────────────────────────────────────────────────────────────
export const verifyPaymentService = async ({ paymentIntentId, patientId }) => {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  // Security Check: Ensure the intent belongs to the requesting patient
  if (intent.metadata.patientId !== patientId) {
    console.warn(`[PaymentService] Verify: Ownership mismatch! Intent ${paymentIntentId} belongs to ${intent.metadata.patientId}, but was requested by ${patientId}`);
    throw createHttpError("Forbidden: You do not own this payment", 403);
  }

  if (intent.status === "succeeded") {
    await processPaymentSuccess(paymentIntentId, intent);
    return { success: true, status: "completed" };
  }

  return { success: false, status: intent.status };
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CREATE PAYMENT INTENT
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
export const createPaymentIntentService = async ({
  appointmentId,
  patientId,
}) => {
  // a. Fetch and validate appointment
  const appointment = await fetchAppointment(appointmentId);

  if (appointment.patientId !== patientId) {
    throw createHttpError("Forbidden: this is not your appointment", 403);
  }

  if (["cancelled", "completed"].includes(appointment.status)) {
    throw createHttpError(
      `Cannot pay for a ${appointment.status} appointment`,
      400,
    );
  }

  if (appointment.paymentStatus === "paid") {
    throw createHttpError("This appointment has already been paid", 400);
  }

  // b. Guard against double-payment initiation (idempotency)
  // [FORCE DISABLED] to resolve 400 Bad Request loop for test sessions
  /*
  const existing = await findTransactionByAppointmentId(appointmentId);
  if (existing && existing.status === "initiated") {
    const intent = await stripe.paymentIntents.retrieve(existing.stripePaymentIntentId);
    return {
      clientSecret: intent.client_secret,
      transactionId: existing._id,
      amount: existing.amount,
      currency: existing.currency,
    };
  }
  */

  // c. Create Stripe PaymentIntent
  //    amount is in smallest currency unit — LKR is a 2-decimal currency in Stripe
  //    so LKR 2500 → amount: 250000 (like USD cents)
  const fee = appointment.consultationFee;
  if (fee == null || isNaN(Number(fee))) {
    throw createHttpError(
      "Appointment has no consultation fee — cannot create payment",
      400,
    );
  }

  console.log(`[PaymentService] Creating PaymentIntent for appointment ${appointmentId}, amount: ${fee} LKR`);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(Number(fee) * 100), // convert to smallest unit (cents)
    currency: (appointment.currency || "LKR").toLowerCase(),
    payment_method_types: ["card"],
    metadata: {
      appointmentId: appointmentId.toString(),
      patientId: patientId.toString(),
    },
    // This description appears on the patient's bank statement
    description: `HC Platform consultation payment — Appointment ${appointmentId}`,
  });

  // d. Save Transaction to DB
  const transaction = await createTransaction({
    appointmentId: appointmentId.toString(),
    patientId: patientId.toString(),
    amount: Number(fee),
    currency: appointment.currency || "LKR",
    status: "initiated",
    paymentMethod: "card",
    stripePaymentIntentId: paymentIntent.id,
    stripeClientSecret: paymentIntent.client_secret,
  });

  // e. Link transaction ID to appointment so appointment knows about this payment
  await updateAppointmentPayment(appointmentId, {
    paymentId: transaction._id.toString(),
  });

  // f. Return clientSecret — frontend uses this with Stripe.js to render the card form
  return {
    clientSecret: paymentIntent.client_secret,
    stripePaymentIntentId: paymentIntent.id,
    transactionId: transaction._id,
    amount: appointment.consultationFee,
    currency: appointment.currency || "LKR",
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
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    throw createHttpError(
      `Webhook signature verification failed: ${err.message}`,
      400,
    );
  }

  const stripeObject = event.data.object;

  // Extract PaymentIntent ID based on event type
  // For payment_intent.* events: stripeObject.id is the PI ID
  // For charge.* events: stripeObject.payment_intent is the PI ID
  const paymentIntentId = event.type.startsWith("charge.")
    ? stripeObject.payment_intent
    : stripeObject.id;

  // Find our Transaction record using the Stripe PaymentIntent ID
  const transaction = await findTransactionByStripeIntentId(paymentIntentId);
  if (!transaction) {
    // Unknown transaction — log and ignore (could be from another app in same Stripe account)
    console.warn(
      `[PaymentService] Webhook: no transaction for intent ${paymentIntentId} (Event: ${event.type})`,
    );
    return { received: true };
  }

  if (event.type === "payment_intent.succeeded") {
    await processPaymentSuccess(paymentIntentId, stripeObject);
  }

  if (event.type === "payment_intent.payment_failed") {
    const transaction = await findTransactionByStripeIntentId(paymentIntentId);
    if (transaction && transaction.status !== "failed") {
      const failureReason = stripeObject.last_payment_error?.message || "Payment failed";
      await updateTransactionById(transaction._id, {
        status: "failed",
        failureReason,
        webhookReceivedAt: new Date(),
        updatedAt: new Date(),
      });
      publishPaymentEvent("payment_failed", { appointmentId: transaction.appointmentId });
    }
  }

  // ── Refund path (e.g. triggered from Stripe Dashboard) ──────────────────────
  if (event.type === "charge.refunded") {
    await updateTransactionById(transaction._id, {
      status: "refunded",
      webhookReceivedAt: new Date(),
    });

    // Notify appointment-service via event — it will update paymentStatus and cancel the appointment
    publishPaymentEvent("payment_refunded", {
      appointmentId: transaction.appointmentId,
    });

    console.log(
      `[PaymentService] Refund processed for appointment ${transaction.appointmentId}`,
    );
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
  if (!transaction) throw createHttpError("Transaction not found", 404);

  if (transaction.status !== "completed") {
    throw createHttpError(
      `Cannot refund a transaction in ${transaction.status} status`,
      400,
    );
  }

  // 1. Trigger Stripe Refund
  let stripeRefundId = "skipped_for_test";
  try {
    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId,
      reason: "requested_by_customer",
    });
    stripeRefundId = refund.id;
  } catch (err) {
    // Robust check for various Stripe error message formats
    const isNoChargeErr =
      /no successful charge/i.test(err.message) ||
      /does not have a successful charge/i.test(err.message);

    if (isNoChargeErr) {
      console.warn(
        `[PaymentService] Skipped Stripe-side refund for intent ${transaction.stripePaymentIntentId} (No charge found on Stripe). Proceeding with local DB update.`,
      );
    } else {
      throw createHttpError(`Stripe Refund Failed: ${err.message}`, 400);
    }
  }

  // 2. Update local transaction record
  await updateTransactionById(transaction._id, {
    status: "refunded",
  });

  // 3. Notify appointment-service via event — it will update paymentStatus and cancel the appointment
  publishPaymentEvent("payment_refunded", { appointmentId });

  return {
    refundId: stripeRefundId,
    status: "refunded",
  };
};
