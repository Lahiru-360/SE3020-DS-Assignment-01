import { body, validationResult } from 'express-validator';

export const analyzeValidators = [
  body('symptoms')
    .isString().withMessage('Symptoms must be a string')
    .trim()
    .notEmpty().withMessage('Symptoms are required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Symptoms must be between 10 and 2000 characters'),
  
  // Middleware to handle the validation result
  (req, res, next) => {
    console.log('[AI-Service] Running validators for symptoms:', req.body.symptoms);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: errors.array()[0].msg,
        data: null
      });
    }
    next();
  }
];
