import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

connectDB();

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
