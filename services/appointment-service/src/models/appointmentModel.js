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
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    type: {
      type: String,
      enum: ['PHYSICAL', 'VIRTUAL'],
      default: 'PHYSICAL',
    },

    // Appointment lifecycle status (unchanged)
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },

    // --- NEW: Payment-related fields ---

    // The fee for THIS appointment set at booking time.
    // Store it here so you have a record even if the doctor
    // changes their fee later. Denominated in smallest unit (cents).
    consultationFee: {
      type: Number,
      required: true,
    },

    // Always store the currency explicitly — never assume.
    currency: {
      type: String,
      default: 'LKR',
      uppercase: true,
    },

    // Tracks whether money has been collected — separate from
    // appointment status. An appointment can be 'confirmed' but
    // still 'unpaid' if the webhook hasn't arrived yet.
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded', 'failed'],
      default: 'unpaid',
    },

    // The _id of the matching document in the transactions collection.
    // Lets you do: Transaction.findById(appointment.paymentId)
    // without needing a separate lookup by appointmentId.
    paymentId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const AppointmentModel = mongoose.model('Appointment', AppointmentSchema);

export default AppointmentModel;
