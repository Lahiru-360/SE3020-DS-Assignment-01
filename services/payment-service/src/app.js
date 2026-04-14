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

// ─── CRITICAL: Stripe webhook requires the RAW body for signature verification.
// We apply express.raw() ONLY on the webhook route, BEFORE the global
// express.json() middleware. Order matters here.
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);

// All other routes use the standard JSON body parser
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Payment Service running', data: null });
});

app.use('/api/payments', paymentRoutes);

app.use(errorHandler);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
});

export default app;
