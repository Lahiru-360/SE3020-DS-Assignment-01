import axiosInstance from "./axiosInstance";

/**
 * Initiate a Stripe payment intent for an appointment.
 * Backend validates ownership, guards against double-payment,
 * and returns the clientSecret used by Stripe.js.
 *
 * @param {string} appointmentId
 * @returns {{ clientSecret, stripePaymentIntentId, transactionId, amount, currency }}
 */
export const createPayment = (appointmentId) =>
  axiosInstance.post("/payments/create-intent", { appointmentId });

/**
 * Get the logged-in patient's complete transaction history.
 * @returns {Array<Transaction>}
 */
export const getPatientPayments = () => axiosInstance.get("/payments/my");
