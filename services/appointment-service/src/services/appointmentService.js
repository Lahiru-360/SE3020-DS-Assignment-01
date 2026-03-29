import axios from 'axios';
import {
  createAppointment,
  findAppointmentById,
  findAppointmentsByPatientId,
  findAppointmentsByDoctorId,
  updateAppointmentById,
} from '../repositories/appointmentRepository.js';
import { createHttpError } from '../utils/httpError.js';

// ─── Allowed status transitions ────────────────────────────────────────────
const STATUS_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
};

// ─── Internal call helpers ──────────────────────────────────────────────────
const internalHeaders = () => ({ 'internal-secret': process.env.INTERNAL_SECRET });

// ─── Book appointment ───────────────────────────────────────────────────────
export const bookAppointmentService = async ({
  patientId,
  patientEmail,
  patientName,
  doctorId,
  date,
  timeSlot,
  notes,
}) => {
  // Fetch doctor details from doctor-service (internal call)
  let doctor;
  try {
    const { data } = await axios.get(
      `${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/${doctorId}`,
      { headers: internalHeaders() }
    );
    doctor = data.data;
  } catch {
    throw createHttpError('Doctor not found', 404);
  }

  if (!doctor) throw createHttpError('Doctor not found', 404);
  if (!doctor.isApproved) throw createHttpError('Doctor is not approved yet', 400);

  const appointment = await createAppointment({
    patientId,
    patientEmail,
    patientName,
    doctorId,
    doctorEmail: doctor.email,
    doctorName:  `${doctor.firstName} ${doctor.lastName}`,
    specialty:   doctor.specialization,
    date:        new Date(date),
    timeSlot,
    notes:       notes || null,
    status:      'pending',
  });

  // Fire-and-forget notifications to both parties
  notifyBoth('appointment_booked', appointment).catch(() => {});

  return appointment;
};

// ─── Get patient's own appointments ────────────────────────────────────────
export const getMyAppointmentsService = (patientId) =>
  findAppointmentsByPatientId(patientId);

// ─── Get doctor's appointments ──────────────────────────────────────────────
export const getDoctorAppointmentsService = (doctorId) =>
  findAppointmentsByDoctorId(doctorId);

// ─── Cancel appointment (patient or doctor) ─────────────────────────────────
export const cancelAppointmentService = async (appointmentId, userId, role) => {
  const appt = await findAppointmentById(appointmentId);
  if (!appt) throw createHttpError('Appointment not found', 404);

  if (role === 'patient' && appt.patientId !== userId) throw createHttpError('Forbidden', 403);
  if (role === 'doctor'  && appt.doctorId  !== userId) throw createHttpError('Forbidden', 403);

  if (!STATUS_TRANSITIONS[appt.status]) {
    throw createHttpError(`Cannot cancel a ${appt.status} appointment`, 400);
  }

  const updated = await updateAppointmentById(appointmentId, { status: 'cancelled' });

  notifyBoth('appointment_cancelled', updated).catch(() => {});

  return updated;
};

// ─── Doctor updates appointment status ─────────────────────────────────────
export const updateAppointmentStatusService = async (appointmentId, doctorId, newStatus) => {
  const appt = await findAppointmentById(appointmentId);
  if (!appt) throw createHttpError('Appointment not found', 404);
  if (appt.doctorId !== doctorId) throw createHttpError('Forbidden', 403);

  const allowed = STATUS_TRANSITIONS[appt.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw createHttpError(
      `Cannot transition appointment from "${appt.status}" to "${newStatus}"`,
      400
    );
  }

  const updated = await updateAppointmentById(appointmentId, { status: newStatus });

  const notifTypeMap = {
    confirmed:  'appointment_confirmed',
    completed:  'appointment_completed',
    cancelled:  'appointment_cancelled',
  };
  notifyBoth(notifTypeMap[newStatus], updated).catch(() => {});

  return updated;
};

// ─── Internal: send notification to patient and doctor ─────────────────────
async function notifyBoth(type, appt) {
  const recipients = [
    { email: appt.patientEmail, name: appt.patientName },
    { email: appt.doctorEmail,  name: `Dr. ${appt.doctorName}` },
  ];

  for (const recipient of recipients) {
    await axios.post(
      `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
      {
        type,
        recipientEmail: recipient.email,
        recipientName:  recipient.name,
        metadata: {
          appointmentId: appt._id,
          patientName:   appt.patientName,
          doctorName:    appt.doctorName,
          specialty:     appt.specialty,
          date:          appt.date,
          timeSlot:      appt.timeSlot,
          status:        appt.status,
        },
      },
      { headers: internalHeaders() }
    );
  }
}
