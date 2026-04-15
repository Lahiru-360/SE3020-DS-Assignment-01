import { Router } from 'express';
import { getOrCreateSession, endSession } from '../controllers/telemedicineController.js';

const router = Router();

router.get('/:appointmentId',      getOrCreateSession);
router.post('/:appointmentId/end', endSession);

export default router;
