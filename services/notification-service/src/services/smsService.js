import { twilioClient } from '../config/twilio.js';

// ─── Built-in SMS body builders (appointment events) ─────────────────────────
// Kept concise to stay within a single SMS segment (≤160 chars where possible).
const buildAppointmentSmsBody = (type, { recipientName, doctorName, specialty, date, timeSlot }) => {
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

  return MESSAGES[type] || null;
};

// ─── Send a single SMS ────────────────────────────────────────────────────────
// Returns the Twilio message SID on success.
// Caller may supply a `message` override; otherwise built-in templates are used.
// Falls back to a generic body when no built-in template matches the type.
export const sendSms = async ({ type, recipientPhone, recipientName, message: messageOverride, metadata }) => {
  const isBuiltIn = ['appointment_booked', 'appointment_confirmed', 'appointment_cancelled', 'appointment_completed'].includes(type);

  let body;
  if (messageOverride) {
    // Caller-supplied message (may optionally be prefixed with [HC Platform])
    body = messageOverride.startsWith('[HC Platform]')
      ? messageOverride
      : `[HC Platform] ${messageOverride}`;
  } else if (isBuiltIn) {
    body = buildAppointmentSmsBody(type, { recipientName, ...metadata });
  } else {
    // Generic fallback — works for any event type
    body = `[HC Platform] Hi ${recipientName}, you have a new notification: ${type}.`;
  }

  const message = await twilioClient.messages.create({
    to:                  recipientPhone,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    body,
  });

  return message.sid;
};
