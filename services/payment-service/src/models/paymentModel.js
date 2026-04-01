import mongoose from 'mongoose';

// Stores a record for every payment attempt linked to an appointment.
// stripePaymentIntentId is the canonical link to the Stripe dashboard.
const PaymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
    },
    patientId: {
      type: String,
      required: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    // Amount is stored in the smallest currency unit (e.g. cents for USD, paise for LKR).
    // Stripe requires amounts in smallest unit — never store as float.
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      lowercase: true,
      default: 'usd',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },
    // clientSecret is needed by the frontend to complete the payment via Stripe.js.
    // Do NOT expose this in list/history endpoints — only in create-intent response.
    stripeClientSecret: {
      type: String,
      required: true,
    },
    // Populated when a refund is issued via Stripe.
    stripeRefundId: {
      type: String,
      default: null,
    },
    // Optional note from patient or system at time of payment.
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

const PaymentModel = mongoose.model('Payment', PaymentSchema);

export default PaymentModel;
