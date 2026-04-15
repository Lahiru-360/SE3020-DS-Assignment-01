import { body } from 'express-validator';

export const sendNotificationValidators = [
  // ── type — any non-empty string (appointment_booked, auth_otp, payment_confirmed, …)
  body('type')
    .trim()
    .notEmpty()
    .withMessage('type is required (e.g. appointment_booked, auth_otp)'),

  // ── channel — which delivery channel(s) to use
  body('channel')
    .optional()
    .isIn(['email', 'sms', 'both'])
    .withMessage("channel must be 'email', 'sms', or 'both'"),

  // ── recipientName — always required
  body('recipientName')
    .trim()
    .notEmpty()
    .withMessage('recipientName is required'),

  // ── recipientEmail — required only when channel is 'email' or 'both' (or unset → defaults to 'both')
  body('recipientEmail')
    .if((value, { req }) => {
      const ch = req.body.channel;
      return !ch || ch === 'email' || ch === 'both';
    })
    .notEmpty()
    .withMessage('recipientEmail is required for email/both channel')
    .bail()
    .isEmail()
    .withMessage('recipientEmail must be a valid email address')
    .normalizeEmail(),

  // ── recipientPhone — required only when channel is 'sms' or 'both'
  body('recipientPhone')
    .if((value, { req }) => {
      const ch = req.body.channel;
      return ch === 'sms' || ch === 'both';
    })
    .notEmpty()
    .withMessage('recipientPhone is required for sms/both channel')
    .bail()
    .matches(/^\+[1-9]\d{6,14}$/)
    .withMessage('recipientPhone must be a valid E.164 number (e.g. +94722745000)'),

  // ── recipientPhone — when present and channel is email, still validate format
  body('recipientPhone')
    .optional({ nullable: true })
    .if((value) => value !== null && value !== undefined && value !== '')
    .matches(/^\+[1-9]\d{6,14}$/)
    .withMessage('recipientPhone must be a valid E.164 number (e.g. +94722745000)'),

  // ── subject — optional custom subject line (email)
  body('subject')
    .optional({ nullable: true })
    .trim()
    .notEmpty()
    .withMessage('subject must not be an empty string if provided'),

  // ── message — optional plain-text body (email body / SMS body override)
  body('message')
    .optional({ nullable: true })
    .trim()
    .notEmpty()
    .withMessage('message must not be an empty string if provided'),

  // ── source — optional originating service identifier
  body('source')
    .optional({ nullable: true })
    .trim(),

  // ── metadata — optional key-value bag
  body('metadata')
    .optional()
    .isObject()
    .withMessage('metadata must be an object'),
];
