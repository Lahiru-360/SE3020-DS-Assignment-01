import { validationResult } from 'express-validator';
import {
  bookAppointmentService,
  getMyAppointmentsService,
  getDoctorAppointmentsService,
  cancelAppointmentService,
  updateAppointmentStatusService,
  searchDoctorsService,
  getAppointmentByIdService,
  updatePaymentStatusService,
} from '../services/appointmentService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

// POST /api/appointments — patient books an appointment
export const bookAppointment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const patientId = req.headers['x-user-id'];
    if (!patientId) return sendError(res, 'Unauthorized', 401);

    const { doctorId, date, phase, notes, type, consultationFee } = req.body;

    const appointment = await bookAppointmentService({
      patientId,
      doctorId,
      date,
      phase,
      notes,
      type,
      consultationFee,
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

// GET /api/appointments/doctors/search — patient searches doctors by specialization or name
export const searchDoctors = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const { specialization, name } = req.query;
    const doctors = await searchDoctorsService({ specialization, name });
    return sendSuccess(res, doctors, 'Doctors retrieved');
  } catch (e) {
    next(e);
  }
};

// GET /api/appointments/internal/:id — internal service fetch by appointment ID
export const getAppointmentInternal = async (req, res, next) => {
  try {
    const appointment = await getAppointmentByIdService(req.params.id);
    if (!appointment) return sendError(res, 'Appointment not found', 404);
    return sendSuccess(res, appointment, 'Appointment fetched');
  } catch (e) {
    next(e);
  }
};

// PATCH /api/appointments/internal/:id/status — internal service status update (no doctor auth)
export const updateAppointmentStatusInternal = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return sendError(res, 'status is required', 422);

    const appointment = await getAppointmentByIdService(req.params.id);
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    const updated = await updateAppointmentStatusService(req.params.id, appointment.doctorId, status);
    return sendSuccess(res, updated, 'Appointment status updated internally');
  } catch (e) {
    next(e);
  }
};

// PATCH /api/appointments/internal/:id/payment — called by payment-service after webhook
// Updates paymentStatus ('unpaid' | 'paid' | 'failed' | 'refunded') and optionally paymentId.
export const updatePaymentStatusInternal = async (req, res, next) => {
  try {
    const { paymentStatus, paymentId } = req.body;
    if (!paymentStatus && !paymentId) {
      return sendError(res, 'paymentStatus or paymentId is required', 422);
    }

    const appointment = await getAppointmentByIdService(req.params.id);
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    const updates = {};
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (paymentId) updates.paymentId = paymentId;

    const updated = await updatePaymentStatusService(req.params.id, updates);
    return sendSuccess(res, updated, 'Appointment payment status updated');
  } catch (e) {
    next(e);
  }
};

