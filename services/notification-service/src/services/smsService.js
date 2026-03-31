import { twilioClient } from '../config/twilio.js';

// ─── SMS body builders by notification type ──────────────────────────────────
// Kept concise to stay within a single SMS segment (≤160 chars where possible).
const buildSmsBody = (type, { recipientName, doctorName, specialty, date, timeSlot }) => {
  const formattedDate = date ? new Date(date).toDateString() : 'N/A';
  const slot          = timeSlot || 'N/A';

  const MESSAGES = {
    appointment_booked:
      `[HC Platform] Hi ${recipientName}, your appointment with Dr. ${doctorName}` +
      ` (${specialty}) on ${formattedDate} at ${slot} has been booked and is pending confirmation.`,

    appointment_confirmed:
      `[HC Platform] Hi ${recipientName}, your appointment with Dr. ${doctorName}` +
      ` (${specialty}) on ${formattedDate} at ${slot} has been confirmed. See you then!`,

    appointment_cancelled:
      `[HC Platform] Hi ${recipientName}, your appointment with Dr. ${doctorName}` +
      ` on ${formattedDate} at ${slot} has been cancelled. Please rebook if needed.`,

    appointment_completed:
      `[HC Platform] Hi ${recipientName}, your appointment with Dr. ${doctorName}` +
      ` has been marked as completed. Thank you for choosing HC Platform.`,
  };

  return MESSAGES[type] || `[HC Platform] Notification: ${type}`;
};

// ─── Send a single SMS ───────────────────────────────────────────────────────
// Returns the Twilio message SID on success.
export const sendSms = async ({ type, recipientPhone, recipientName, metadata }) => {
  const body = buildSmsBody(type, { recipientName, ...metadata });

  const message = await twilioClient.messages.create({
    to:                   recipientPhone,
    messagingServiceSid:  process.env.TWILIO_MESSAGING_SERVICE_SID,
    body,
  });

  return message.sid;
};
