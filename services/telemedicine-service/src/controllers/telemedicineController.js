import { getOrCreateSessionService, endSessionService } from '../services/telemedicineService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

// GET /api/telemedicine/sessions/:appointmentId
// Patient or doctor requests a meeting URL for a virtual appointment.
export const getOrCreateSession = async (req, res, next) => {
  try {
    const userId    = req.headers['x-user-id'];
    const role      = req.headers['x-user-role'];
    const userEmail = req.headers['x-user-email'];
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const { appointmentId } = req.params;
    const session = await getOrCreateSessionService(appointmentId, userId, role, userEmail);

    return sendSuccess(res, session, 'Telemedicine session ready');
  } catch (e) {
    next(e);
  }
};

// POST /api/telemedicine/sessions/:appointmentId/end
// Doctor ends the active telemedicine session.
export const endSession = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const role   = req.headers['x-user-role'];
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const { appointmentId } = req.params;
    const session = await endSessionService(appointmentId, userId, role);

    return sendSuccess(res, session, 'Telemedicine session ended');
  } catch (e) {
    next(e);
  }
};
