import { Router } from 'express';
import { getSmartMatch } from '../controllers/aiController.js';

const router = Router();

router.post('/analyze', getSmartMatch);

export default router;
