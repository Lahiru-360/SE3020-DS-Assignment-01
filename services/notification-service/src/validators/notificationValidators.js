import { body } from 'express-validator';

export const sendNotificationValidators = [
  body('type')
    .isIn([
      'appointment_booked',
      'appointment_confirmed',
      'appointment_cancelled',
      'appointment_completed',
    ])
    .withMessage('Invalid notification type'),
  body('recipientEmail')
    .isEmail().withMessage('Valid recipientEmail is required')
    .normalizeEmail(),
  body('recipientName')
    .trim()
    .notEmpty().withMessage('recipientName is required'),
  body('metadata')
    .optional()
    .isObject().withMessage('metadata must be an object'),
];
