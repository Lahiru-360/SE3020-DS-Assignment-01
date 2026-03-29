import { validationResult } from 'express-validator';
import {
  bookAppointmentService,
  getMyAppointmentsService,
  getDoctorAppointmentsService,
  cancelAppointmentService,
  updateAppointmentStatusService,
} from '../services/appointmentService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

// POST /api/appointments — patient books an appointment
export const bookAppointment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const patientId    = req.headers['x-user-id'];
    const patientEmail = req.headers['x-user-email'];
    if (!patientId) return sendError(res, 'Unauthorized', 401);

    const { doctorId, patientName, date, timeSlot, notes } = req.body;

    const appointment = await bookAppointmentService({
      patientId,
      patientEmail,
      patientName,
      doctorId,
      date,
      timeSlot,
      notes,
    });

    return sendSuccess(res, appointment, 'Appointment booked successfully', 201);
  } catch (e) {
    next(e);
  }
};

// GET /api/appointments/my — patient views own appointments
export const getMyAppointments = async (req, res, next) => {
  try {
    const patientId = req.headers['x-user-id'];
    if (!patientId) return sendError(res, 'Unauthorized', 401);

    const appointments = await getMyAppointmentsService(patientId);
    return sendSuccess(res, appointments, 'Appointments fetched');
  } catch (e) {
    next(e);
  }
};

// GET /api/appointments/doctor — doctor views their appointments
export const getDoctorAppointments = async (req, res, next) => {
  try {
    const doctorId = req.headers['x-user-id'];
    if (!doctorId) return sendError(res, 'Unauthorized', 401);

    const appointments = await getDoctorAppointmentsService(doctorId);
    return sendSuccess(res, appointments, 'Appointments fetched');
  } catch (e) {
    next(e);
  }
};

// PATCH /api/appointments/:id/cancel — patient or doctor cancels
export const cancelAppointment = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const role   = req.headers['x-user-role'];
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const appointment = await cancelAppointmentService(req.params.id, userId, role);
    return sendSuccess(res, appointment, 'Appointment cancelled');
  } catch (e) {
    next(e);
  }
};

// PATCH /api/appointments/:id/status — doctor updates status
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const doctorId = req.headers['x-user-id'];
    if (!doctorId) return sendError(res, 'Unauthorized', 401);

    const { status } = req.body;
    const appointment = await updateAppointmentStatusService(req.params.id, doctorId, status);
    return sendSuccess(res, appointment, 'Appointment status updated');
  } catch (e) {
    next(e);
  }
};
