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

// ─── Allowed status transitions ────────────────────────────────────────────
const STATUS_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
};

// ─── Internal call helper ───────────────────────────────────────────────────
const internalHeaders = () => ({ 'x-internal-secret': process.env.INTERNAL_SECRET });

// ─── Book appointment ───────────────────────────────────────────────────────
export const bookAppointmentService = async ({
  patientId,
  doctorId,
  date,
  timeSlot,
  notes,
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

  // 2. Normalise date to "YYYY-MM-DD" (input may be "2026-04-05" or full ISO8601)
  //    new Date("YYYY-MM-DD") parses as UTC midnight — consistent with storage.
  const dateStr = new Date(date).toISOString().slice(0, 10);

  // 3. Fetch doctor's availability for this date (shared helper)
  const availForDate = await fetchAvailabilityForDate(doctorId, dateStr);
  if (!availForDate || !availForDate.timeslots?.length) {
    throw createHttpError('Doctor has no availability on this date', 400);
  }

  // 4. Validate that the requested timeSlot lands on a valid 20-min boundary
  const allSlots = [];
  for (const ts of availForDate.timeslots) {
    allSlots.push(...generateSubSlots(ts.startTime, ts.endTime));
  }
  if (!allSlots.includes(timeSlot)) {
    throw createHttpError(
      `Invalid time slot "${timeSlot}". Valid slots on this date: ${allSlots.join(', ')}`,
      400
    );
  }

  // 5. Check for an existing active booking on this exact slot (prevent double-booking)
  const conflict = await findActiveBookingForSlot(doctorId, dateStr, timeSlot);
  if (conflict) {
    throw createHttpError('This time slot is already booked', 409);
  }

  // 6. Store minimal references + scheduling data — no personal details.
  //    Use UTC midnight so the date is consistent with all query boundaries.
  const appointment = await createAppointment({
    patientId,
    doctorId,
    date:    new Date(`${dateStr}T00:00:00.000Z`),
    timeSlot,
    notes:   notes || null,
    status:  'pending',
  });

  // 7. Fire-and-forget notifications to both parties
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
// Fetches personal details on-demand — no personal data stored in appointment.
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
    await axios.post(
      `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
      {
        type,
        recipientEmail: recipient.email,
        recipientName:  recipient.name,
        recipientPhone: recipient.phone,
        metadata,
      },
      { headers: internalHeaders() }
    );
  }
}

// ─── Helper: generate 20-min (configurable) sub-slots from a time range ────
// startTime and endTime are "HH:mm" strings.
// Returns an array of "HH:mm" strings: ["09:00", "09:20", ...]
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

// ─── Helper: fetch the availability document for a doctor on a specific date ─
// dateStr must be "YYYY-MM-DD". Returns the matching availability doc or null.
// Shared by bookAppointmentService and getAvailableSlotsService to avoid
// duplicating the axios call + date-filter logic.
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

// ─── Get available 20-min slots for a doctor on a date ────────────────────
export const getAvailableSlotsService = async ({ doctorId, date }) => {
  // Normalise date to "YYYY-MM-DD" (may arrive as string or Date object)
  const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().slice(0, 10);

  // Fetch and filter availability via shared helper
  const availForDate = await fetchAvailabilityForDate(doctorId, dateStr);

  if (!availForDate || !availForDate.timeslots?.length) {
    return { date: dateStr, availableSlots: [] };
  }

  // Generate all possible 20-min sub-slots from doctor's time ranges
  const allSlots = [];
  for (const ts of availForDate.timeslots) {
    allSlots.push(...generateSubSlots(ts.startTime, ts.endTime));
  }

  // Subtract already-booked slots
  const bookings = await findActiveBookingsForDoctorOnDate(doctorId, dateStr);
  const bookedSet = new Set(bookings.map((b) => b.timeSlot));
  const availableSlots = allSlots.filter((s) => !bookedSet.has(s));

  return { date: dateStr, availableSlots };
};
