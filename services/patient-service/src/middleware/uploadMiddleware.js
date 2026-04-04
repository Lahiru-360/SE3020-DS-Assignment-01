import multer from 'multer';
import { sendError } from '../utils/responseHelper.js';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});


export const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large. Maximum allowed size is 10 MB.'
          : err.message;
      return sendError(res, message, 422);
    }

    // fileFilter rejection
    return sendError(res, err.message, 422);
  });
};
