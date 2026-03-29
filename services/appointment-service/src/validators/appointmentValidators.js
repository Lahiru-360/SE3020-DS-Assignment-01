import { body } from 'express-validator';

export const bookAppointmentValidators = [
  body('doctorId')
    .trim()
    .notEmpty().withMessage('doctorId is required'),
  body('patientName')
    .trim()
    .notEmpty().withMessage('patientName is required')
    .isLength({ max: 100 }).withMessage('patientName must not exceed 100 characters'),
  body('date')
    .isISO8601().withMessage('A valid date (ISO 8601) is required'),
  body('timeSlot')
    .trim()
    .notEmpty().withMessage('timeSlot is required'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('notes must not exceed 500 characters'),
];

export const updateStatusValidators = [
  body('status')
    .isIn(['confirmed', 'cancelled', 'completed'])
    .withMessage('status must be one of: confirmed, cancelled, completed'),
];
