import { body } from 'express-validator';

// ─── Reusable field validators ─────────────────────────────────

const firstNameValidator = body('firstName')
  .optional()
  .trim()
  .notEmpty().withMessage('First name must not be blank')
  .isLength({ max: 50 }).withMessage('First name must not exceed 50 characters')
  .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name must contain letters only');

const lastNameValidator = body('lastName')
  .optional()
  .trim()
  .notEmpty().withMessage('Last name must not be blank')
  .isLength({ max: 50 }).withMessage('Last name must not exceed 50 characters')
  .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name must contain letters only');

const phoneValidator = body('phone')
  .optional()
  .trim()
  .notEmpty().withMessage('Phone number must not be blank')
  .matches(/^\+?[\d\s\-]{7,15}$/).withMessage('Phone number must be a valid format (7–15 digits)');

// Ensures at least one updatable field is present in the request body.
const atLeastOneFieldValidator = body()
  .custom((_, { req }) => {
    const allowed = ['firstName', 'lastName', 'phone'];
    const provided = allowed.filter((f) => req.body[f] !== undefined);
    if (provided.length === 0) {
      throw new Error('At least one field (firstName, lastName, phone) must be provided');
    }
    return true;
  });

// ─── Route-level validator arrays ──────────────────────────────

export const updatePatientProfileValidators = [
  atLeastOneFieldValidator,
  firstNameValidator,
  lastNameValidator,
  phoneValidator,
];

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
