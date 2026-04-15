import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import telemedicineRoutes from './routes/telemedicineRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

connectDB();

// Connect to RabbitMQ so the session publisher has a channel ready.
connectRabbitMQ()
  .catch((err) => console.error('[RabbitMQ] Failed to connect:', err.message));

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Telemedicine Service running', data: null });
});

app.use('/api/telemedicine/sessions', telemedicineRoutes);

app.use(errorHandler);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Telemedicine Service running on port ${PORT}`);
});

export default app;
