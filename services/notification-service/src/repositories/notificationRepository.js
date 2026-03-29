import NotificationModel from '../models/notificationModel.js';

export const createNotification = (data) => NotificationModel.create(data);

export const findNotificationsByRecipient = (email) =>
  NotificationModel.find({ recipientEmail: email }).sort({ createdAt: -1 });
