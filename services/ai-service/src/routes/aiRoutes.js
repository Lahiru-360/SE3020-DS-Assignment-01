import { Router } from 'express';
import { getSmartMatch } from '../controllers/aiController.js';
import { analyzeValidators } from '../validators/ai.validators.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ 
    status: "ok", 
    service: "ai-service", 
    timestamp: new Date().toISOString() 
  });
});

router.post('/analyze', analyzeValidators, getSmartMatch);

export default router;
