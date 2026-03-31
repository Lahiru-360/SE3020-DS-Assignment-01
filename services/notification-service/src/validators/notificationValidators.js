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

  // Optional — if provided, must be a valid E.164 phone number (e.g. +94722745000)
  body('recipientPhone')
    .optional({ nullable: true })
    .matches(/^\+[1-9]\d{6,14}$/)
    .withMessage('recipientPhone must be a valid E.164 number (e.g. +94722745000)'),

  body('metadata')
    .optional()
    .isObject().withMessage('metadata must be an object'),
];
