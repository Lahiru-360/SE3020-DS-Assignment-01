import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

connectDB();

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// ─── IMPORTANT: Stripe webhook route MUST use express.raw() ───────────────
// Stripe signs webhooks with a HMAC signature computed on the raw request body.
// If the body is parsed as JSON first, the signature check FAILS.
// So: mount /webhook BEFORE the global express.json() middleware.
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    // Delegate to the regular router — body is already raw Buffer here.
    next();
  }
);

// Global JSON body parser — applies to all other routes.
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Payment Service running', data: null });
});

// ── Payment routes ────────────────────────────────────────────────────────
app.use('/api/payments', paymentRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    data: null,
  });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
});

export default app;
