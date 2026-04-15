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

// ─── Active bookings for a doctor on a specific date (for slot computation) ──
// dateStr must be "YYYY-MM-DD". Queries pending + confirmed only — cancelled/
// completed appointments do NOT occupy a slot.
//
// UTC boundary note: `new Date("YYYY-MM-DD")` in Node.js is interpreted as
// UTC midnight, so the start/end boundaries here (T00:00:00.000Z / T23:59:59.999Z)
// are consistent with how bookAppointmentService stores dates via `new Date(date)`.
// Both sides use UTC — do NOT change one without changing the other.
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

// ─── Single-slot conflict check (double-booking prevention) ──────────────────
// Returns the conflicting appointment document if slot is taken, null if free.
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


