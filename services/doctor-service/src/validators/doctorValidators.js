import { body, param } from "express-validator";

export const createDoctorProfileValidators = [
  body("userId").trim().notEmpty().withMessage("userId is required"),
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 50 })
    .withMessage("First name must not exceed 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("First name must contain letters only"),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 50 })
    .withMessage("Last name must not exceed 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("Last name must contain letters only"),
  body("specialization")
    .trim()
    .notEmpty()
    .withMessage("Specialization is required")
    .isLength({ max: 100 })
    .withMessage("Specialization must not exceed 100 characters"),
  body("licenseNumber")
    .trim()
    .notEmpty()
    .withMessage("License number is required")
    .isLength({ max: 50 })
    .withMessage("License number must not exceed 50 characters")
    .matches(/^[a-zA-Z0-9\-/]+$/)
    .withMessage("License number must be alphanumeric"),
  body("consultationFee")
    .notEmpty()
    .withMessage("Consultation fee is required")
    .isFloat({ min: 0 })
    .withMessage("Consultation fee must be a number greater than or equal to 0")
    .toFloat(),
];

export const updateDoctorProfileValidators = [
  param("userId").trim().notEmpty().withMessage("userId parameter is required"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("First name must not exceed 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("First name must contain letters only"),
  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("Last name must not exceed 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("Last name must contain letters only"),
  body("phone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Phone cannot be empty if provided"),
  body("specialization")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Specialization cannot be empty if provided")
    .isLength({ max: 100 })
    .withMessage("Specialization must not exceed 100 characters"),
  body("licenseNumber")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("License number cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("License number must not exceed 50 characters")
    .matches(/^[a-zA-Z0-9\-/]+$/)
    .withMessage("License number must be alphanumeric"),
  body("consultationFee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Consultation fee must be a number greater than or equal to 0")
    .toFloat(),
];
