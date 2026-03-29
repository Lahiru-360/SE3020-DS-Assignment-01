import mongoose from 'mongoose';

// Persists a log of every notification attempt for audit/retry purposes.
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
