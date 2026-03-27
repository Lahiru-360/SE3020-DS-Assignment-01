import { body } from 'express-validator';

export const createDoctorProfileValidators = [
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
  body('specialization')
    .trim()
    .notEmpty().withMessage('Specialization is required')
    .isLength({ max: 100 }).withMessage('Specialization must not exceed 100 characters'),
  body('licenseNumber')
    .trim()
    .notEmpty().withMessage('License number is required')
    .isLength({ max: 50 }).withMessage('License number must not exceed 50 characters')
    .matches(/^[a-zA-Z0-9\-/]+$/).withMessage('License number must be alphanumeric'),
];
