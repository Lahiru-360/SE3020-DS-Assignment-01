import { body, param } from 'express-validator';

export const uploadReportValidators = [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
];

export const reportIdParamValidator = [
  param('reportId')
    .isMongoId().withMessage('Invalid report ID'),
];
