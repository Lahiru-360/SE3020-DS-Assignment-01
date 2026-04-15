// ─────────────────────────────────────────────────────────────────────────────
// Doctor Service API Layer
//
// All requests are sent through the shared axiosInstance which:
//   • Targets the API Gateway (VITE_API_BASE_URL or http://localhost:5000/api)
//   • Automatically attaches the Bearer JWT token from localStorage
//   • Handles global 401 errors by clearing tokens and redirecting to /login
//
// Backend routes (via API Gateway → doctor-service):
//   PUT  /doctors/profile/:userId          — update own profile (doctor only)
//   GET  /availability/:doctorId           — get availability for a doctor
//   POST /availability                     — add availability (doctor only)
//   PUT  /availability/:doctorId/:date/slots/:phase  — edit a slot (doctor only)
//   DELETE /availability/:doctorId/:date/slots/:phase — delete a slot (doctor only)
//   GET  /appointments/doctor              — get doctor's own appointments
//   PATCH /appointments/:id/status         — update appointment status (doctor only)
//   PATCH /appointments/:id/cancel         — cancel appointment
// ─────────────────────────────────────────────────────────────────────────────

import axiosInstance from "./axiosInstance";

// ── Profile ───────────────────────────────────────────────────────────────

export const getDoctorProfile = (userId) =>
  axiosInstance.get(`/doctors/profile/${userId}`);

export const updateDoctorProfile = (userId, data) =>
  axiosInstance.put(`/doctors/profile/${userId}`, data);

// ── Availability ──────────────────────────────────────────────────────────

export const getDoctorAvailability = (doctorId) =>
  axiosInstance.get(`/availability/${doctorId}`);

export const addDoctorAvailability = (data) =>
  axiosInstance.post("/availability", data);

export const editDoctorAvailabilitySlot = (doctorId, date, phase, data) =>
  axiosInstance.put(`/availability/${doctorId}/${date}/slots/${phase}`, data);

export const deleteDoctorAvailabilitySlot = (doctorId, date, phase) =>
  axiosInstance.delete(`/availability/${doctorId}/${date}/slots/${phase}`);

// ── Appointments ──────────────────────────────────────────────────────────

export const getDoctorAppointments = () =>
  axiosInstance.get("/appointments/doctor");

export const updateAppointmentStatus = (appointmentId, status) =>
  axiosInstance.patch(`/appointments/${appointmentId}/status`, { status });

export const cancelAppointment = (appointmentId) =>
  axiosInstance.patch(`/appointments/${appointmentId}/cancel`);

// ── Prescriptions ─────────────────────────────────────────────────────────
//
// POST   /prescriptions                   — create (doctor only; appt must be completed)
// PUT    /prescriptions/:id               — update diagnosis/medications/notes (doctor only)
// GET    /prescriptions/doctor/:doctorId  — list all prescriptions for a doctor
// GET    /prescriptions/:id/pdf           — download PDF (returns binary blob)

export const createPrescription = (data) =>
  axiosInstance.post("/prescriptions", data);

export const updatePrescription = (id, data) =>
  axiosInstance.put(`/prescriptions/${id}`, data);

export const getDoctorPrescriptions = (doctorId) =>
  axiosInstance.get(`/prescriptions/doctor/${doctorId}`);

// responseType: 'blob' tells axios to give back raw binary for the PDF.
export const downloadPrescriptionPdf = (prescriptionId) =>
  axiosInstance.get(`/prescriptions/${prescriptionId}/pdf`, {
    responseType: "blob",
  });
