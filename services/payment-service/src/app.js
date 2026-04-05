import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { stripeWebhook } from './controllers/paymentController.js';
import { errorHandler } from './middleware/errorHandler.js';

connectDB();

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// ── CRITICAL: Stripe webhook must use raw body (no JSON parsing) ────────────
// The webhook signature verification depends on the exact raw body bytes.
// So this route is handled BEFORE app.use(express.json()).
app.post('/api/payments/stripe-webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// ── Now add the standard JSON parser for all other routes ────────────────────
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Payment Service running', data: null });
});

app.use('/api/payments', paymentRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
});

export default app;
