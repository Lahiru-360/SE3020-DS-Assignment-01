import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import patientRoutes from './routes/patientRoutes.js';
import medicalReportRoutes from './routes/medicalReportRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

connectDB();

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Patient Service running', data: null });
});

app.use('/api/patients', patientRoutes);
app.use('/api/patients', medicalReportRoutes);

app.use(errorHandler);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Patient Service running on port ${PORT}`);
});

export default app;
