import AppointmentModel from '../models/appointmentModel.js';

export const createAppointment = (data) => AppointmentModel.create(data);

export const findAppointmentById = (id) => AppointmentModel.findById(id);

export const findAppointmentsByPatientId = (patientId) =>
  AppointmentModel.find({ patientId }).sort({ date: -1 });

export const findAppointmentsByDoctorId = (doctorId) =>
  AppointmentModel.find({ doctorId }).sort({ date: -1 });

export const updateAppointmentById = (id, updates) =>
  AppointmentModel.findByIdAndUpdate(id, updates, { new: true });

export const deleteAppointmentById = (id) => AppointmentModel.findByIdAndDelete(id);

// ─── Active bookings for one doctor on one date (slot allocation) ───────────
// dateStr must be "YYYY-MM-DD".
// Only active appointments count: pending/confirmed (cancelled/completed are ignored).
// Failed payments are excluded from slot occupancy.
//
// UTC contract:
// - Node treats new Date("YYYY-MM-DD") as UTC midnight.
// - We query full UTC day bounds: 00:00:00.000Z to 23:59:59.999Z.
// - This must stay aligned with bookAppointmentService date storage logic.
export const findActiveBookingsForDoctorOnDate = (doctorId, dateStr) => {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end   = new Date(`${dateStr}T23:59:59.999Z`);
  return AppointmentModel.find({
    doctorId,
    date:   { $gte: start, $lte: end },
    status: { $in: ['pending', 'confirmed'] },
    paymentStatus: { $ne: 'failed' },
  }).select('timeSlot');
};

// ─── Single-slot conflict check (prevents double-booking) ───────────────────
// Same active-booking rules and UTC day bounds as above.
// Returns the conflicting appointment if occupied, otherwise null.
export const findActiveBookingForSlot = (doctorId, dateStr, timeSlot) => {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end   = new Date(`${dateStr}T23:59:59.999Z`);
  return AppointmentModel.findOne({
    doctorId,
    date:     { $gte: start, $lte: end },
    timeSlot,
    status:   { $in: ['pending', 'confirmed'] },
    paymentStatus: { $ne: 'failed' },
  });
};


