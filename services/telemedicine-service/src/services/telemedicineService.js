import axios from 'axios';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import {
  findOrCreateSession,
  findSessionByAppointmentId,
  updateSessionStatusByAppointmentId,
} from '../repositories/telemedicineRepository.js';
import { createHttpError } from '../utils/httpError.js';
import { buildJoinUrl } from '../utils/jaasHelper.js';
import { publishSessionEnded } from '../events/sessionPublisher.js';

const SESSION_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const SL_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // Sri Lanka UTC+5:30 in milliseconds

const internalHeaders = () => ({ 'x-internal-secret': process.env.INTERNAL_SECRET });

async function fetchAppointment(appointmentId) {
  try {
    const { data } = await axios.get(
      `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/internal/${appointmentId}`,
      { headers: internalHeaders() }
    );
    return data.data;
  } catch (err) {
    if (err.response?.status === 404) throw createHttpError('Appointment not found', 404);
    throw createHttpError('Appointment service unavailable', 502);
  }
}

function getScheduledTime(appointment) {
  const [startTime] = appointment.timeSlot.split('-');
  const [hours, minutes] = startTime.split(':').map(Number);
  const dateUtcMidnight = new Date(appointment.date);
  dateUtcMidnight.setUTCHours(0, 0, 0, 0);
  const slotMs = (hours * 60 + minutes) * 60 * 1000;
  return new Date(dateUtcMidnight.getTime() + slotMs - SL_OFFSET_MS);
}

export const getOrCreateSessionService = async (appointmentId, userId, role, userEmail) => {  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw createHttpError('Invalid appointment ID', 400);
  }
  // 1. Fetch and validate appointment
  const appointment = await fetchAppointment(appointmentId);

  if (appointment.type !== 'VIRTUAL') {
    throw createHttpError('Appointment is not a virtual appointment', 400);
  }

  if (appointment.status !== 'confirmed') {
    throw createHttpError('Appointment must be confirmed to join a telemedicine session', 400);
  }

  // 2. Validate user access
  const isPatient = role === 'patient' && appointment.patientId === userId;
  const isDoctor  = role === 'doctor'  && appointment.doctorId  === userId;
  if (!isPatient && !isDoctor) {
    throw createHttpError('Forbidden: you are not a participant of this appointment', 403);
  }

  // 3. Time window check: allow join from (scheduled - 1h) to (scheduled + 1h)
  const now       = Date.now();
  const scheduled = getScheduledTime(appointment);
  const windowStart = scheduled.getTime() - SESSION_WINDOW_MS;
  const windowEnd   = scheduled.getTime() + SESSION_WINDOW_MS;

  if (now < windowStart) {
    throw createHttpError('Too early to join: session is not open yet', 403);
  }
  if (now > windowEnd) {
    throw createHttpError('Session has expired', 403);
  }

  // 4. Atomically find existing session or create new one
  const roomName = `med-${appointmentId}-${randomUUID()}`;
  let session = await findOrCreateSession(appointmentId, roomName);

  if (session.status === 'ENDED') {
    throw createHttpError('Telemedicine session has already ended', 403);
  }

  // Mark session as ACTIVE on first join
  if (session.status === 'CREATED') {
    session = await updateSessionStatusByAppointmentId(appointmentId, 'ACTIVE');
  }

  // 5. Generate a per-user signed JaaS join URL (doctor = moderator)
  const joinUrl = buildJoinUrl({
    roomName:    session.roomName,
    userId,
    userEmail:   userEmail || userId,
    userName:    role === 'doctor' ? 'Doctor' : 'Patient',
    isModerator: role === 'doctor',
  });

  return { ...session.toObject(), joinUrl };
};

// ─── End a telemedicine session (doctor only) ────────────────────────────────
export const endSessionService = async (appointmentId, userId, role) => {
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw createHttpError('Invalid appointment ID', 400);
  }

  if (role !== 'doctor') {
    throw createHttpError('Forbidden: only the doctor can end a session', 403);
  }

  // Validate appointment and doctor assignment
  const appointment = await fetchAppointment(appointmentId);

  if (appointment.doctorId !== userId) {
    throw createHttpError('Forbidden: you are not the doctor for this appointment', 403);
  }

  const session = await findSessionByAppointmentId(appointmentId);
  if (!session) {
    throw createHttpError('Session not found', 404);
  }

  if (session.status === 'ENDED') {
    throw createHttpError('Session has already ended', 400);
  }

  const updated = await updateSessionStatusByAppointmentId(appointmentId, 'ENDED');

  publishSessionEnded(appointmentId);

  return updated;
};
