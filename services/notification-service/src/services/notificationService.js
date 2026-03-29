import { sendEmail } from './emailService.js';
import { createNotification } from '../repositories/notificationRepository.js';

// Sends email and persists a record regardless of send outcome.
export const processNotificationService = async ({
  type,
  recipientEmail,
  recipientName,
  metadata,
}) => {
  let status  = 'sent';
  let subject = type;

  try {
    subject = await sendEmail({ type, recipientEmail, recipientName, metadata });
  } catch (err) {
    console.error(`[NotificationService] Email failed for ${recipientEmail}:`, err.message);
    status = 'failed';
  }

  const record = await createNotification({
    type,
    recipientEmail,
    recipientName,
    subject,
    status,
    metadata: metadata || {},
  });

  return record;
};
