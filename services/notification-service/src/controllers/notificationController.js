import { validationResult } from 'express-validator';
import { processNotificationService } from '../services/notificationService.js';
import { findNotificationsByRecipient, findNotificationsByType, findNotificationsBySource } from '../repositories/notificationRepository.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

// POST /api/notifications/send — internal only (guarded by internalAuth)
// Accessible by any internal service (appointment, auth, doctor, patient, …)
export const sendNotification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const {
      type,
      channel,
      recipientEmail,
      recipientName,
      recipientPhone,
      subject,
      message,
      source,
      metadata,
    } = req.body;

    const record = await processNotificationService({
      type,
      channel,
      recipientEmail,
      recipientName,
      recipientPhone,
      subject,
      message,
      source,
      metadata,
    });

    return sendSuccess(res, record, 'Notification processed', 201);
  } catch (e) {
    next(e);
  }
};

// GET /api/notifications — query notification logs (internal only)
// Query params:
//   ?email=user@example.com   — filter by recipient email
//   ?type=appointment_booked  — filter by notification type
//   ?source=appointment-service — filter by originating service
export const getNotifications = async (req, res, next) => {
  try {
    const { email, type, source } = req.query;

    let records;
    if (email) {
      records = await findNotificationsByRecipient(email);
    } else if (type) {
      records = await findNotificationsByType(type);
    } else if (source) {
      records = await findNotificationsBySource(source);
    } else {
      return sendError(res, 'Provide at least one query param: email, type, or source', 400);
    }

    return sendSuccess(res, records, 'Notifications retrieved');
  } catch (e) {
    next(e);
  }
};
