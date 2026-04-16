import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startNotificationConsumer } from './events/notificationConsumer.js';

connectDB();

// Connect to RabbitMQ and start the appointment event consumer.
// connectRabbitMQ retries indefinitely — the callback runs each time a fresh
// connection is established, including after mid-runtime reconnects.
connectRabbitMQ(async () => {
  await startNotificationConsumer();
});

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Notification Service running', data: null });
});

app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});

export default app;
