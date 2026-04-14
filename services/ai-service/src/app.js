import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import aiRoutes from './routes/aiRoutes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'AI suggestion service running', data: null });
});

app.use('/ai', aiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: null
  });
});

app.listen(config.PORT, () => {
  console.log(`AI suggestion service running on port ${config.PORT}`);
});

export default app;
