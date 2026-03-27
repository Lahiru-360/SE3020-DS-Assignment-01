import { body } from 'express-validator';

// ─── Reusable field validators ─────────────────────────────────

const emailValidator = body('email')
  .isEmail().withMessage('Valid email is required')
  .normalizeEmail();

const passwordValidator = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
  .matches(/[0-9]/).withMessage('Password must contain at least one number')
  .matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/).withMessage('Password must contain at least one special character');

const firstNameValidator = body('firstName')
  .trim()
  .notEmpty().withMessage('First name is required')
  .isLength({ max: 50 }).withMessage('First name must not exceed 50 characters')
  .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name must contain letters only');

const lastNameValidator = body('lastName')
  .trim()
  .notEmpty().withMessage('Last name is required')
  .isLength({ max: 50 }).withMessage('Last name must not exceed 50 characters')
  .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name must contain letters only');

const phoneValidator = body('phone')
  .trim()
  .notEmpty().withMessage('Phone number is required')
  .matches(/^\+?[\d\s\-]{7,15}$/).withMessage('Phone number must be a valid format (7–15 digits)');

// ─── Route-level validator arrays ──────────────────────────────

export const registerPatientValidators = [
  emailValidator,
  passwordValidator,
  firstNameValidator,
  lastNameValidator,
  phoneValidator,
];

export const registerDoctorValidators = [
  emailValidator,
  passwordValidator,
  firstNameValidator,
  lastNameValidator,
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

export const loginValidators = [
  emailValidator,
  body('password').notEmpty().withMessage('Password is required'),
];
