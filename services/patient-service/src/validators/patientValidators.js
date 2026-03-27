import { body } from 'express-validator';

export const createPatientProfileValidators = [
  body('userId')
    .trim()
    .notEmpty().withMessage('userId is required'),
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name must not exceed 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name must contain letters only'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name must not exceed 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name must contain letters only'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[\d\s\-]{7,15}$/).withMessage('Phone number must be a valid format (7–15 digits)'),
];
