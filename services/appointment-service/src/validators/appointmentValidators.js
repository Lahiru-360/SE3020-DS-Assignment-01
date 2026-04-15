import { body, query } from 'express-validator';

export const bookAppointmentValidators = [
  body('doctorId')
    .trim()
    .notEmpty().withMessage('doctorId is required'),
  body('date')
    .isISO8601().withMessage('A valid date (ISO 8601) is required'),
  body('phase')
    .isIn(['morning', 'evening']).withMessage('phase must be morning or evening'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('notes must not exceed 500 characters'),
  body('type')
    .optional()
    .isIn(['PHYSICAL', 'VIRTUAL']).withMessage('type must be PHYSICAL or VIRTUAL'),
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
