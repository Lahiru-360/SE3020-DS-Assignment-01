import axios from 'axios';
import {
  createAppointment,
  findAppointmentById,
  findAppointmentsByPatientId,
  findAppointmentsByDoctorId,
  updateAppointmentById,
  findActiveBookingsForDoctorOnDate,
  findActiveBookingForSlot,
} from '../repositories/appointmentRepository.js';
import { createHttpError } from '../utils/httpError.js';
import { publishAppointmentEvent } from '../events/appointmentPublisher.js';

// ─── Allowed status transitions ────────────────────────────────────────────
const STATUS_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
};

// ─── Internal call helper ───────────────────────────────────────────────────
const internalHeaders = () => ({ 'x-internal-secret': process.env.INTERNAL_SECRET });

// ─── Book appointment ───────────────────────────────────────────────────────
// Patient supplies { doctorId, date, phase: "morning"|"evening", notes }.
// The system auto-assigns the nearest free 20-min slot in that phase (queue).
export const bookAppointmentService = async ({
  patientId,
  doctorId,
  date,
  phase,
  notes,
  type,
}) => {
  // 1. Validate doctor exists and is approved (internal call to doctor-service)
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

  // 2. Normalise date to "YYYY-MM-DD"
  const dateStr = new Date(date).toISOString().slice(0, 10);

  // 3. Fetch doctor's availability for this date
  const availForDate = await fetchAvailabilityForDate(doctorId, dateStr);
  if (!availForDate || !availForDate.timeslots?.length) {
    throw createHttpError('Doctor has no availability on this date', 400);
  }

  // 4. Find the timeslot block that matches the requested phase
  const phaseBlock = availForDate.timeslots.find((ts) => ts.phase === phase);
  if (!phaseBlock) {
    throw createHttpError(
      `Doctor has no ${phase} session on this date`,
      400
    );
  }

  // 5. Generate all 20-min sub-slots for that phase block
  const allSlots = generateSubSlots(phaseBlock.startTime, phaseBlock.endTime);

  // 6. Fetch all active bookings for this doctor on this date
  const bookings = await findActiveBookingsForDoctorOnDate(doctorId, dateStr);
  const bookedSet = new Set(bookings.map((b) => b.timeSlot));

  // 7. Queue: pick the first slot not yet booked
  const assignedSlot = allSlots.find((s) => !bookedSet.has(s));
  if (!assignedSlot) {
    throw createHttpError(
      `No available slots for the ${phase} session on this date`,
      409
    );
  }

  // 8. Double-booking guard (race-condition safety)
  const conflict = await findActiveBookingForSlot(doctorId, dateStr, assignedSlot);
  if (conflict) {
    throw createHttpError(
      `No available slots for the ${phase} session on this date`,
      409
    );
  }

  // 9. Persist the appointment with the auto-assigned slot
  const appointment = await createAppointment({
    patientId,
    doctorId,
    date:     new Date(`${dateStr}T00:00:00.000Z`),
    timeSlot: assignedSlot,
    notes:    notes || null,
    status:   'pending',
    type:     type || 'PHYSICAL',
  });

  // 10. Fire-and-forget notifications to both parties
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

// ─── Search doctors by specialization / name ───────────────────────────────
export const searchDoctorsService = async ({ specialization, name }) => {
  const params = new URLSearchParams();
  if (specialization) params.append('specialization', specialization);
  if (name)           params.append('name', name);

  const { data } = await axios.get(
    `${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/search?${params}`,
    { headers: internalHeaders() }
  );
  return data.data;
};

// ─── Fetch patient details from patient-service ─────────────────────────────
async function fetchPatient(patientId) {
  try {
    const { data } = await axios.get(
      `${process.env.PATIENT_SERVICE_URL}/api/patients/internal/${patientId}`,
      { headers: { 'x-internal-secret': process.env.INTERNAL_SECRET } }
    );
    return data.data;
  } catch {
    return null;
  }
}

// ─── Fetch doctor details from doctor-service ──────────────────────────────
async function fetchDoctor(doctorId) {
  try {
    const { data } = await axios.get(
      `${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/${doctorId}`,
      { headers: internalHeaders() }
    );
    return data.data;
  } catch {
    return null;
  }
}

// ─── Send notification to patient and doctor ───────────────────────────────
async function notifyBoth(type, appt) {
  const [patient, doctor] = await Promise.all([
    fetchPatient(appt.patientId),
    fetchDoctor(appt.doctorId),
  ]);

  const patientEmail = patient?.email ?? '';
  const patientName  = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';
  const patientPhone = patient?.phone ?? null;
  const doctorEmail  = doctor?.email  ?? '';
  const doctorName   = doctor  ? `${doctor.firstName} ${doctor.lastName}`   : 'Doctor';
  const specialty    = doctor?.specialization ?? '';

  const metadata = {
    appointmentId: appt._id,
    patientName,
    doctorName,
    specialty,
    date:     appt.date,
    timeSlot: appt.timeSlot,
    status:   appt.status,
  };

  const recipients = [
    { email: patientEmail, name: patientName, phone: patientPhone },
    { email: doctorEmail,  name: `Dr. ${doctorName}` },
  ];

  for (const recipient of recipients) {
    if (!recipient.email) continue;
    // Publish one message per recipient to RabbitMQ.
    // The notification-service consumer picks these up and handles email + SMS.
    publishAppointmentEvent(type, {
      type,
      recipientEmail: recipient.email,
      recipientName:  recipient.name,
      recipientPhone: recipient.phone ?? null,
      source:         'appointment-service',
      metadata,
    });
  }
}

// ─── Helper: generate 20-min (configurable) sub-slots from a time range ────
// startTime and endTime are "HH:mm" strings.
// Returns an array of "HH:mm" start times: ["09:00", "09:20", ...]
function generateSubSlots(startTime, endTime) {
  const slotMinutes = parseInt(process.env.SLOT_DURATION_MINUTES, 10) || 20;

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH,   endM  ] = endTime.split(':').map(Number);

  const startTotal = startH * 60 + startM;
  const endTotal   = endH   * 60 + endM;

  const slots = [];
  for (let t = startTotal; t + slotMinutes <= endTotal; t += slotMinutes) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
}

// ─── Helper: fetch availability document for a doctor on a specific date ───
// dateStr must be "YYYY-MM-DD". Returns the matching availability doc or null.
async function fetchAvailabilityForDate(doctorId, dateStr) {
  try {
    const { data } = await axios.get(
      `${process.env.DOCTOR_SERVICE_URL}/api/availability/${doctorId}`,
      { headers: internalHeaders() }
    );
    const docs = data.data || [];
    return docs.find((a) => a.date === dateStr) || null;
  } catch {
    throw createHttpError('Could not fetch doctor availability', 502);
  }
}

// ─── Get appointment by ID (for internal service-to-service calls) ──────────
export const getAppointmentByIdService = (appointmentId) =>
  findAppointmentById(appointmentId);
