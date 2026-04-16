import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startAppointmentCancelledConsumer } from './events/appointmentCancelledConsumer.js';

connectDB();

// Connect to RabbitMQ and start the appointment cancelled consumer.
// connectRabbitMQ retries indefinitely — the callback runs each time a fresh
// connection is established, including after mid-runtime reconnects.
connectRabbitMQ(async () => {
  await startAppointmentCancelledConsumer();
});

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
