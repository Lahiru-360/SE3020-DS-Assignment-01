import dotenv from 'dotenv';
dotenv.config(); // Let docker-compose env_file handle it, or .env in root of service

export const config = {
  PORT: process.env.PORT || 5008,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  GEMINI_BASE_URL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
  INTERNAL_SECRET: process.env.INTERNAL_SECRET || 'change_this_internal_secret',
  DOCTOR_SERVICE_URL: process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:5001',
};
