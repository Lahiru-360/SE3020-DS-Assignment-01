import { body, param } from "express-validator";

export const addAvailabilityValidators = [
  // doctorId is derived from the verified JWT (x-user-id header) — not accepted from body.
  body("date")
    .trim()
    .notEmpty()
    .withMessage("Date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Date must be in YYYY-MM-DD format"),
  body("slots")
    .isArray({ min: 1, max: 2 })
    .withMessage("Slots must be an array with 1 or 2 blocks"),
  body("slots.*.phase")
    .trim()
    .notEmpty()
    .withMessage("Phase is required")
    .isIn(["morning", "evening"])
    .withMessage("Phase must be morning or evening"),
  body("slots.*.indexes")
    .isArray({ min: 1 })
    .withMessage("Indexes must be a non-empty array of numbers"),
];

export const getDoctorAvailabilitiesValidators = [
  param("doctorId").trim().notEmpty().withMessage("doctorId is required"),
];

export const editAvailabilityValidators = [
  param("doctorId").trim().notEmpty().withMessage("doctorId is required"),
  param("date")
    .trim()
    .notEmpty()
    .withMessage("Date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Date must be in YYYY-MM-DD format"),
  param("phase")
    .isIn(["morning", "evening"])
    .withMessage("Phase must be morning or evening"),
  body("indexes")
    .isArray({ min: 1 })
    .withMessage("Indexes must be a non-empty array of numbers"),
];

export const deleteAvailabilityValidators = [
  param("doctorId").trim().notEmpty().withMessage("doctorId is required"),
  param("date")
    .trim()
    .notEmpty()
    .withMessage("Date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Date must be in YYYY-MM-DD format"),
  param("phase")
    .isIn(["morning", "evening"])
    .withMessage("Phase must be morning or evening"),
];
