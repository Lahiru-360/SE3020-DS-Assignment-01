import NotificationModel from '../models/notificationModel.js';

// ── Create ─────────────────────────────────────────────────────────────────
export const createNotification = (data) => NotificationModel.create(data);

// ── Read ───────────────────────────────────────────────────────────────────
export const findNotificationsByRecipient = (email) =>
  NotificationModel.find({ recipientEmail: email }).sort({ createdAt: -1 });

export const findNotificationsByType = (type) =>
  NotificationModel.find({ type }).sort({ createdAt: -1 });

export const findNotificationsBySource = (source) =>
  NotificationModel.find({ source }).sort({ createdAt: -1 });
