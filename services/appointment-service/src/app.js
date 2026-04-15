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

connectDB();

// Connect to RabbitMQ and start the session.ended consumer.
// Uses the same fire-and-forget pattern as connectDB() — the HTTP server
// starts immediately and RabbitMQ connects/retries in the background.
connectRabbitMQ()
  .then(startSessionConsumer)
  .catch((err) => console.error('[RabbitMQ] Failed to start session consumer:', err.message));

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
