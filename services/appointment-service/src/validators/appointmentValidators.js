import { body, query } from 'express-validator';

export const bookAppointmentValidators = [
  body('doctorId')
    .trim()
    .notEmpty().withMessage('doctorId is required'),
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

export const searchDoctorsValidators = [
  query('specialization')
    .optional()
    .trim()
    .notEmpty().withMessage('specialization cannot be blank'),
  query('name')
    .optional()
    .trim()
    .notEmpty().withMessage('name cannot be blank'),
];

export const getAvailableSlotsValidators = [
  query('doctorId')
    .trim()
    .notEmpty().withMessage('doctorId is required'),
  query('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be in YYYY-MM-DD format'),
];

