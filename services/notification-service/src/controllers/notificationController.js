import { validationResult } from 'express-validator';
import { processNotificationService } from '../services/notificationService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

// POST /api/notifications/send — internal only (guarded by internalAuth)
export const sendNotification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const { type, recipientEmail, recipientName, recipientPhone, metadata } = req.body;

    const record = await processNotificationService({
      type,
      recipientEmail,
      recipientName,
      recipientPhone,   // optional — triggers SMS channel when present
      metadata,
    });

    return sendSuccess(res, record, 'Notification processed', 201);
  } catch (e) {
    next(e);
  }
};
