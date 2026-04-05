import axios from 'axios';

// ─── Internal header helper ─────────────────────────────────────────────────
const internalHeaders = () => ({ 'x-internal-secret': process.env.INTERNAL_SECRET });
const baseUrl = () => process.env.PAYMENT_SERVICE_URL;

// ─── Initiate a Stripe PaymentIntent via payment-service ────────────────────
// Called immediately after an appointment is created.
// Returns { stripeClientSecret, paymentIntentId, status }
// The stripeClientSecret must be forwarded to the frontend so Stripe.js can
// complete the payment — it should NEVER be stored in the appointment record.
export const initiatePayment = async ({
  appointmentId,
  patientId,
  doctorId,
  amount,
  currency,
  description,
}) => {
  const { data } = await axios.post(
    `${baseUrl()}/api/payments/internal/initiate`,
    { appointmentId, patientId, doctorId, amount, currency, description },
    { headers: internalHeaders() }
  );
  return data.data; // { stripeClientSecret, paymentIntentId, status }
};

// ─── Request a refund via payment-service ───────────────────────────────────
// Called fire-and-forget when an appointment is cancelled.
// The payment-service will issue the Stripe refund and push the updated status
// back via PATCH /api/appointments/internal/payment-status.
export const requestRefund = async (appointmentId) => {
  const { data } = await axios.post(
    `${baseUrl()}/api/payments/internal/refund`,
    { appointmentId },
    { headers: internalHeaders() }
  );
  return data.data;
};
