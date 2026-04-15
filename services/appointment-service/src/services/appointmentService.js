import axios from 'axios';
import {
  createAppointment,
  findAppointmentById,
  findAppointmentsByPatientId,
  findAppointmentsByDoctorId,
  updateAppointmentById,
  deleteAppointmentById,
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
// Patient supplies { doctorId, date, phase: "morning"|"evening", notes }.
// The system auto-assigns the nearest free 20-min slot in that phase (queue).
export const bookAppointmentService = async ({
  patientId,
  doctorId,
  date,
  phase,
  notes,
  type,
  consultationFee,
  currency,
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

  // 7. Queue: pick the first slot not yet booked AND not already started (same-day guard)
  //
  // When the appointment is for TODAY (in the configured timezone), we skip any
  // slot whose 20-min window has already begun — slotStart <= localNow.
  // Example: booking at 10:21 LKT → skip 10:20, assign 10:40.
  //
  // TIMEZONE env var controls which timezone "today" and "now" are evaluated
  // in. Defaults to Asia/Colombo (Sri Lanka, UTC+5:30). Change it in .env if
  // the server is relocated.
  const tz = process.env.TIMEZONE || 'Asia/Colombo';

  // Get the current local date string "YYYY-MM-DD" in the configured timezone
  const localNowParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
  }).formatToParts(new Date());
  const todayStr = localNowParts.map((p) => p.value).join(''); // "YYYY-MM-DD"
  const isToday  = dateStr === todayStr;

  // Get current local time as total minutes (HH * 60 + mm) in the same timezone
  let nowMinutes = 0;
  if (isToday) {
    const timeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour:     '2-digit',
      minute:   '2-digit',
      hour12:   false,
    }).formatToParts(new Date());
    const localH = Number(timeParts.find((p) => p.type === 'hour').value);
    const localM = Number(timeParts.find((p) => p.type === 'minute').value);
    nowMinutes = localH * 60 + localM;
  }

  const assignedSlot = allSlots.find((s) => {
    if (bookedSet.has(s)) return false;                        // already booked
    if (isToday) {
      const [h, m] = s.split(':').map(Number);
      const slotStart = h * 60 + m;
      if (slotStart <= nowMinutes) return false;               // slot already started
    }
    return true;
  });
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
    date:            new Date(`${dateStr}T00:00:00.000Z`),
    timeSlot:        assignedSlot,
    notes:           notes || null,
    status:          'pending',
    type:            type || 'PHYSICAL',
    consultationFee: consultationFee || doctor.consultationFee,
    currency:        currency || doctor.currency || 'LKR',
  });

  // 10. Fire-and-forget notifications to both parties
  notifyBoth('appointment_booked', appointment).catch((err) =>
    console.warn('[AppointmentService] notifyBoth error (booked):', err.message)
  );

  return appointment;
};

// ─── Get patient's own appointments ────────────────────────────────────────
export const getMyAppointmentsService = (patientId) =>
  findAppointmentsByPatientId(patientId);

// ─── Get doctor's appointments ──────────────────────────────────────────────
export const getDoctorAppointmentsService = (doctorId) =>
  findAppointmentsByDoctorId(doctorId);

// ─── Cancel appointment (patient or doctor only; not admin) ───────────────────
export const cancelAppointmentService = async (appointmentId, userId, role) => {
  const appt = await findAppointmentById(appointmentId);
  if (!appt) throw createHttpError('Appointment not found', 404);

  if (role === 'admin') {
    throw createHttpError('Admins are not permitted to cancel appointments', 403);
  }
  if (role !== 'patient' && role !== 'doctor') {
    throw createHttpError('Forbidden', 403);
  }

  if (role === 'patient' && appt.patientId !== userId) throw createHttpError('Forbidden', 403);
  if (role === 'doctor'  && appt.doctorId  !== userId) throw createHttpError('Forbidden', 403);

  if (!STATUS_TRANSITIONS[appt.status]) {
    throw createHttpError(`Cannot cancel a ${appt.status} appointment`, 400);
  }

  if (appt.paymentStatus === 'paid') {
    const deleted = await deleteAppointmentById(appointmentId);
    try {
      await axios.post(
        `${process.env.PAYMENT_SERVICE_URL}/api/payments/internal/refund/${appointmentId}`,
        {},
        { headers: internalHeaders() }
      );
    } catch (err) {
      console.error('[AppointmentService] Refund failed', {
        appointmentId,
        paymentId: appt.paymentId,
        error: err.message,
      });
      // do NOT throw — cancel still succeeds
    }
    notifyBoth('appointment_cancelled', appt).catch((err) =>
      console.warn('[AppointmentService] notifyBoth error (cancelled):', err.message)
    );
    return deleted;
  }

  const updated = await updateAppointmentById(appointmentId, { status: 'cancelled' });

  notifyBoth('appointment_cancelled', updated).catch((err) =>
    console.warn('[AppointmentService] notifyBoth error (cancelled):', err.message)
  );

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
  notifyBoth(notifTypeMap[newStatus], updated).catch((err) =>
    console.warn('[AppointmentService] notifyBoth error (status update):', err.message)
  );

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
  const patientPhone = patient?.phone   || null;   // null if absent — triggers email-only
  const doctorEmail  = doctor?.email   ?? '';
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

  // Doctor phone is not fetched — always email-only for the doctor.
  const recipients = [
    { email: patientEmail, name: patientName,       phone: patientPhone },
    { email: doctorEmail,  name: `Dr. ${doctorName}`, phone: null },
  ];

  for (const recipient of recipients) {
    // Skip entirely if we have no address to deliver to
    if (!recipient.email) continue;

    // Use 'both' only when a valid phone number is available; otherwise 'email'.
    // This prevents the notification-service validator from rejecting the request
    // when recipientPhone is absent.
    const channel = recipient.phone ? 'both' : 'email';

    const payload = {
      type,
      channel,
      recipientEmail: recipient.email,
      recipientName:  recipient.name,
      metadata,
    };
    // Only include recipientPhone in the payload when it exists
    if (recipient.phone) payload.recipientPhone = recipient.phone;

    try {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
        payload,
        { headers: internalHeaders() }
      );
    } catch (err) {
      // Log per-recipient failures so they are visible in service logs,
      // but continue sending to the remaining recipients.
      console.error(
        `[AppointmentService] Notification (${type}) failed for ${recipient.email}:`,
        err.response?.data ?? err.message
      );
    }
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

// ─── Hard-delete appointment (internal; e.g. payment-service after failed payment) ─
export const deleteAppointmentInternalService = async (appointmentId) => {
  const deleted = await deleteAppointmentById(appointmentId);
  if (!deleted) throw createHttpError('Appointment not found', 404);
  return deleted;
};

// ─── Update appointment payment fields (called by payment-service webhook) ──
// Updates paymentStatus ('unpaid' | 'paid' | 'failed' | 'refunded')
// and optionally paymentId (the Transaction _id from payment-service).
export const updatePaymentStatusService = (appointmentId, updates) =>
  updateAppointmentById(appointmentId, updates);

