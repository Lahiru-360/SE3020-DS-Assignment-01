import { sendEmail } from './emailService.js';
import { sendSms }   from './smsService.js';
import { createNotification } from '../repositories/notificationRepository.js';

// ─── Process a notification request from any internal service ────────────────
//
// channel: 'email' | 'sms' | 'both' (default: 'both' for backward compat)
// subject: optional email subject override
// message: optional plain-text body override (used for both email and SMS)
// source:  optional originating service label (e.g. 'appointment-service')
//
export const processNotificationService = async ({
  type,
  channel = 'both',
  recipientEmail,
  recipientName,
  recipientPhone,
  subject,
  message,
  source,
  metadata,
}) => {
  const sendEmail_ = channel === 'email' || channel === 'both';
  const sendSms_   = channel === 'sms'   || channel === 'both';

  let emailStatus = 'skipped';
  let resolvedSubject = subject || type;
  let smsStatus = 'skipped';
  let smsSid    = null;

  // ── Email channel ─────────────────────────────────────────────────────────
  if (sendEmail_) {
    try {
      resolvedSubject = await sendEmail({
        type,
        recipientEmail,
        recipientName,
        subject,
        message,
        metadata,
      });
      emailStatus = 'sent';
    } catch (err) {
      console.error(`[NotificationService] Email failed for ${recipientEmail}:`, err.message);
      emailStatus = 'failed';
    }
  }

  // ── SMS channel ───────────────────────────────────────────────────────────
  if (sendSms_ && recipientPhone) {
    try {
      smsSid    = await sendSms({ type, recipientPhone, recipientName, message, metadata });
      smsStatus = 'sent';
    } catch (err) {
      console.error(`[NotificationService] SMS failed for ${recipientPhone}:`, err.message);
      smsStatus = 'failed';
    }
  } else if (sendSms_ && !recipientPhone) {
    // channel requested SMS but no phone supplied — log and skip gracefully
    console.warn(`[NotificationService] SMS skipped — no recipientPhone provided for type: ${type}`);
  }

  const record = await createNotification({
    type,
    source:        source || null,
    channel,
    recipientEmail: recipientEmail || null,
    recipientName,
    recipientPhone: recipientPhone || null,
    subject:        resolvedSubject,
    status:         emailStatus,
    smsStatus,
    smsSid,
    metadata:       metadata || {},
  });

  return record;
};
