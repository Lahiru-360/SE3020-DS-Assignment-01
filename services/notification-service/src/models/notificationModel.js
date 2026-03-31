import mongoose from 'mongoose';

// Persists a log of every notification attempt (email + SMS) for audit/retry purposes.
const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'appointment_booked',
        'appointment_confirmed',
        'appointment_cancelled',
        'appointment_completed',
      ],
      required: true,
    },

    // ── Email channel ──────────────────────────────────────────────────────
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },

    // ── SMS channel (optional) ─────────────────────────────────────────────
    recipientPhone: {
      type: String,
      trim: true,
      default: null,
    },
    smsStatus: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      default: 'skipped',
    },
    smsSid: {
      type: String,   // Twilio Message SID (SM…)
      default: null,
    },

    // ── Shared metadata ────────────────────────────────────────────────────
    // Flexible store for appointment details (id, names, date, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const NotificationModel = mongoose.model('Notification', NotificationSchema);

export default NotificationModel;
