import mongoose from 'mongoose';

// Minimal appointment schema — only stores IDs (references) and scheduling data.
// Personal details (names, emails, specialty) are fetched on-demand from
// patient-service and doctor-service when needed (e.g. for notifications).
const AppointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    // ── Payment fields (populated after payment-service initiates a PaymentIntent) ──
    // paymentIntentId links this record to the payment-service's PaymentModel.
    // NULL only transiently between createAppointment and initiatePayment calls.
    paymentIntentId: {
      type: String,
      default: null,
    },
    // Mirrors payment-service status for quick reads. Updated via internal webhook.
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    // Consultation fee snapshot from doctor profile at booking time (in cents/LKR smallest unit)
    // Stored for display on confirmation page and refund reference
    consultationFee: {
      type: Number,
      default: null,
    },
    // ── Cancellation & Refund Tracking ─────────────────────────────────────
    // Tracks who cancelled and why (for audit trail and analytics)
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor'],
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
      // Examples: "Won't attend", "Doctor unavailable", "Technical issue", etc.
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const AppointmentModel = mongoose.model('Appointment', AppointmentSchema);

export default AppointmentModel;
