import { body } from 'express-validator';

// ── Create Payment Intent ──────────────────────────────────────────────────
export const createPaymentIntentValidators = [
  body('appointmentId')
    .notEmpty().withMessage('appointmentId is required')
    .isString().withMessage('appointmentId must be a string'),

  body('patientId')
    .notEmpty().withMessage('patientId is required')
    .isString().withMessage('patientId must be a string'),

  body('doctorId')
    .notEmpty().withMessage('doctorId is required')
    .isString().withMessage('doctorId must be a string'),

  // Amount in smallest currency unit (e.g. cents). Must be > 0.
  body('amount')
    .notEmpty().withMessage('amount is required')
    .isInt({ min: 1 }).withMessage('amount must be a positive integer (smallest currency unit)'),

  body('currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 }).withMessage('currency must be a 3-letter ISO code (e.g. usd)'),

  body('description')
    .optional()
    .isString(),
];

// ── Confirm Payment ────────────────────────────────────────────────────────
export const confirmPaymentValidators = [
  body('paymentIntentId')
    .notEmpty().withMessage('paymentIntentId is required')
    .isString().withMessage('paymentIntentId must be a string'),
];

// ── Refund Payment ─────────────────────────────────────────────────────────
export const refundPaymentValidators = [
  body('paymentId')
    .notEmpty().withMessage('paymentId is required')
    .isString().withMessage('paymentId must be a string'),
];
