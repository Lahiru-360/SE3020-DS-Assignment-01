import mongoose from 'mongoose';

// Persists a log of every notification attempt (email + SMS) for audit/retry purposes.
// The `type` field is now a free-form string so any service can define its own event names.
const NotificationSchema = new mongoose.Schema(
  {
    // ── Event type (free-form) ─────────────────────────────────────────────────
    // e.g. 'appointment_booked', 'auth_otp', 'payment_confirmed', 'doctor_approved'
    type: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Source service (optional) ─────────────────────────────────────────────
    // Helps with filtering logs by originating service (e.g. 'appointment-service')
    source: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Channel selector ─────────────────────────────────────────────────────
    // 'email' → email only  |  'sms' → SMS only  |  'both' → email + SMS
    channel: {
      type: String,
      enum: ['email', 'sms', 'both'],
      default: 'both',
    },

    // ── Email channel ─────────────────────────────────────────────────────────
    recipientEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      default: 'skipped',
    },

    // ── SMS channel ───────────────────────────────────────────────────────────
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

    // ── Shared metadata ───────────────────────────────────────────────────────
    // Flexible store for any contextual data (appointment id, OTP, order id, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const NotificationModel = mongoose.model('Notification', NotificationSchema);

export default NotificationModel;
