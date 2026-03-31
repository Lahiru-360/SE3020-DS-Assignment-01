import { sendEmail } from './emailService.js';
import { sendSms }   from './smsService.js';
import { createNotification } from '../repositories/notificationRepository.js';

// Sends email (always) + SMS (when recipientPhone is provided),
// then persists a single record regardless of channel outcomes.
export const processNotificationService = async ({
  type,
  recipientEmail,
  recipientName,
  recipientPhone,
  metadata,
}) => {
  let status    = 'sent';
  let subject   = type;
  let smsStatus = 'skipped';   // 'sent' | 'failed' | 'skipped'
  let smsSid    = null;

  // ── Email ──────────────────────────────────────────────────────────────────
  try {
    subject = await sendEmail({ type, recipientEmail, recipientName, metadata });
  } catch (err) {
    console.error(`[NotificationService] Email failed for ${recipientEmail}:`, err.message);
    status = 'failed';
  }

  // ── SMS (optional — only when a phone number is supplied) ──────────────────
  if (recipientPhone) {
    try {
      smsSid    = await sendSms({ type, recipientPhone, recipientName, metadata });
      smsStatus = 'sent';
    } catch (err) {
      console.error(`[NotificationService] SMS failed for ${recipientPhone}:`, err.message);
      smsStatus = 'failed';
    }
  }

  const record = await createNotification({
    type,
    recipientEmail,
    recipientName,
    recipientPhone,
    subject,
    status,
    smsStatus,
    smsSid,
    metadata: metadata || {},
  });

  return record;
};
