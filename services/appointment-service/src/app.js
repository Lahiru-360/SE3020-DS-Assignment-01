import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startSessionConsumer } from './events/sessionConsumer.js';
import { startPaymentConsumer } from './events/paymentConsumer.js';

connectDB();

// Connect to RabbitMQ and start consumers.
// connectRabbitMQ retries indefinitely — the callback runs each time a fresh
// connection is established, including after mid-runtime reconnects.
connectRabbitMQ(async () => {
  await startSessionConsumer();
  await startPaymentConsumer();
});

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Appointment Service running', data: null });
});

app.use('/api/appointments', appointmentRoutes);

app.use(errorHandler);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Appointment Service running on port ${PORT}`);
});

export default app;
