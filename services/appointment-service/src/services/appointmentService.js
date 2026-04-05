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
  findAppointmentByIntentId,
} from '../repositories/appointmentRepository.js';
import { createHttpError } from '../utils/httpError.js';
import { initiatePayment, requestRefund } from '../utils/paymentClient.js';

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
// After the appointment is persisted, a Stripe PaymentIntent is initiated via
// the payment-service. If payment initiation fails the appointment is deleted
// (rolled back) so the DB never holds an orphaned un-payable record.
export const bookAppointmentService = async ({
  patientId,
  doctorId,
  date,
  phase,
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
  });

  // 10. Initiate payment via payment-service
  // consultationFee from doctor profile is already in smallest currency unit (e.g. cents).
  const amount   = doctor.consultationFee;
  const currency = process.env.PAYMENT_CURRENCY || 'lkr';

  let paymentData;
  try {
    paymentData = await initiatePayment({
      appointmentId: appointment._id.toString(),
      patientId,
      doctorId,
      amount,
      currency,
      description: `Consultation with Dr. ${doctor.firstName} ${doctor.lastName} on ${dateStr}`,
    });
  } catch {
    // Payment initiation failed — roll back the appointment to keep DB consistent
    await deleteAppointmentById(appointment._id);
    throw createHttpError('Payment service unavailable. Please try again.', 502);
  }

  // 11. Stamp the appointment with the PaymentIntent reference and consultation fee
  const finalAppointment = await updateAppointmentById(appointment._id, {
    paymentIntentId: paymentData.paymentIntentId,
    paymentStatus:   'pending',
    consultationFee: amount,  // Store fee snapshot from doctor profile
  });

  // 12. Fire-and-forget notifications to both parties
  notifyBoth('appointment_booked', finalAppointment).catch(() => {});

  // Return the full appointment + stripeClientSecret so the frontend can
  // call Stripe.js to complete the payment. stripeClientSecret is NOT stored
  // in the DB (matches payment-service design — only exposed at creation time).
  return {
    ...finalAppointment.toObject(),
    stripeClientSecret: paymentData.stripeClientSecret,
  };
};

// ─── Get patient's own appointments ────────────────────────────────────────
export const getMyAppointmentsService = (patientId) =>
  findAppointmentsByPatientId(patientId);

// ─── Get doctor's appointments ──────────────────────────────────────────────
export const getDoctorAppointmentsService = (doctorId) =>
  findAppointmentsByDoctorId(doctorId);

// ─── Cancel appointment (patient or doctor) ─────────────────────────────────
// After updating the appointment status to 'cancelled', a refund is requested
// from the payment-service (fire-and-forget). The payment-service will push
// the final paymentStatus back via the internal webhook.
export const cancelAppointmentService = async (appointmentId, userId, role, reason = null) => {
  const appt = await findAppointmentById(appointmentId);
  if (!appt) throw createHttpError('Appointment not found', 404);

  if (role === 'patient' && appt.patientId !== userId) throw createHttpError('Forbidden', 403);
  if (role === 'doctor'  && appt.doctorId  !== userId) throw createHttpError('Forbidden', 403);

  if (!STATUS_TRANSITIONS[appt.status]) {
    throw createHttpError(`Cannot cancel a ${appt.status} appointment`, 400);
  }

  // Update appointment with cancellation details
  const updated = await updateAppointmentById(appointmentId, { 
    status: 'cancelled',
    cancelledBy: role,                    // 'patient' or 'doctor'
    cancellationReason: reason,           // User-provided reason
    cancelledAt: new Date(),              // Timestamp of cancellation
  });

  // Fire-and-forget refund — payment-service will issue the Stripe refund and
  // push the confirmed 'refunded' paymentStatus back via internal webhook.
  requestRefund(appointmentId).catch(() => {});

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

  // If the doctor cancels, also fire a refund
  if (newStatus === 'cancelled') {
    requestRefund(appointmentId).catch(() => {});
  }

  return updated;
};

// ─── Update paymentStatus (called by payment-service internal webhook) ───────
// Accepts paymentStatus values that mirror the payment-service's PaymentModel enum.
// If Stripe reports 'failed', the appointment is also auto-cancelled so that the
// slot is released and the patient is notified.
export const updatePaymentStatusService = async (appointmentId, paymentStatus) => {
  const VALID_PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];
  if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    throw createHttpError(`Invalid payment status: ${paymentStatus}`, 400);
  }

  const appt = await findAppointmentById(appointmentId);
  if (!appt) throw createHttpError('Appointment not found', 404);

  const updates = { paymentStatus };

  // Auto-cancel the appointment when Stripe payment fails so the slot is freed
  if (paymentStatus === 'failed' && STATUS_TRANSITIONS[appt.status]) {
    updates.status = 'cancelled';
  }

  const updated = await updateAppointmentById(appointmentId, updates);

  // Notify both parties when payment failure forces a cancellation
  if (updates.status === 'cancelled') {
    notifyBoth('appointment_cancelled', updated).catch(() => {});
  }

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
    date:          appt.date,
    timeSlot:      appt.timeSlot,
    status:        appt.status,
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
