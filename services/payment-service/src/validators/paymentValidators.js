import { body } from 'express-validator';

export const createPaymentIntentValidators = [
  body('appointmentId')
    .trim()
    .notEmpty().withMessage('appointmentId is required')
    .isMongoId().withMessage('appointmentId must be a valid MongoDB ID'),
];
