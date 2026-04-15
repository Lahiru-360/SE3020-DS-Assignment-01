import { body, param } from "express-validator";

const medicationValidators = [
  body("medications")
    .isArray({ min: 1 })
    .withMessage("medications must be a non-empty array"),
  body("medications.*.name")
    .trim()
    .notEmpty()
    .withMessage("Medication name is required"),
  body("medications.*.dosage")
    .trim()
    .notEmpty()
    .withMessage("Medication dosage is required"),
  body("medications.*.frequency")
    .trim()
    .notEmpty()
    .withMessage("Medication frequency is required"),
  body("medications.*.duration")
    .trim()
    .notEmpty()
    .withMessage("Medication duration is required"),
];

export const createPrescriptionValidators = [
  body("doctorId").trim().notEmpty().withMessage("doctorId is required"),
  body("patientId").trim().notEmpty().withMessage("patientId is required"),
  body("appointmentId")
    .trim()
    .notEmpty()
    .withMessage("appointmentId is required"),
  body("diagnosis").trim().notEmpty().withMessage("diagnosis is required"),
  ...medicationValidators,
  body("notes")
    .optional({ nullable: true })
    .isString()
    .withMessage("notes must be a string")
    .trim(),
];

export const updatePrescriptionValidators = [
  param("id").isMongoId().withMessage("Valid prescription id is required"),
  body().custom((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Invalid request body");
    }

    const allowedKeys = ["diagnosis", "medications", "notes"];
    const bodyKeys = Object.keys(value);

    const hasUnknownKey = bodyKeys.some((key) => !allowedKeys.includes(key));
    if (hasUnknownKey) {
      throw new Error("Only diagnosis, medications, and notes can be updated");
    }

    const hasAllowedField =
      value.diagnosis !== undefined ||
      value.medications !== undefined ||
      value.notes !== undefined;

    if (!hasAllowedField) {
      throw new Error("At least one updatable field is required");
    }

    return true;
  }),
  body("diagnosis")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("diagnosis cannot be empty"),
  body("medications")
    .optional()
    .isArray({ min: 1 })
    .withMessage("medications must be a non-empty array")
    .custom((medications) => {
      const hasInvalidMedication = medications.some(
        (medication) =>
          !medication ||
          typeof medication.name !== "string" ||
          !medication.name.trim() ||
          typeof medication.dosage !== "string" ||
          !medication.dosage.trim() ||
          typeof medication.frequency !== "string" ||
          !medication.frequency.trim() ||
          typeof medication.duration !== "string" ||
          !medication.duration.trim(),
      );

      if (hasInvalidMedication) {
        throw new Error(
          "Each medication must include name, dosage, frequency, and duration",
        );
      }

      return true;
    }),
  body("medications.*.name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Medication name is required"),
  body("medications.*.dosage")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Medication dosage is required"),
  body("medications.*.frequency")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Medication frequency is required"),
  body("medications.*.duration")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Medication duration is required"),
  body("notes")
    .optional({ nullable: true })
    .isString()
    .withMessage("notes must be a string")
    .trim(),
];

export const prescriptionIdParamValidator = [
  param("id").isMongoId().withMessage("Valid prescription id is required"),
];

export const patientIdParamValidator = [
  param("patientId")
    .trim()
    .notEmpty()
    .withMessage("patientId parameter is required"),
];

export const doctorIdParamValidator = [
  param("doctorId")
    .trim()
    .notEmpty()
    .withMessage("doctorId parameter is required"),
];
