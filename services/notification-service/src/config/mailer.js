import nodemailer from 'nodemailer';

// Nodemailer transporter configured from environment variables.
// For Gmail: set EMAIL_HOST=smtp.gmail.com, EMAIL_PORT=587
// Use an App Password (not your account password) when 2FA is enabled.
export const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   Number(process.env.EMAIL_PORT) || 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
