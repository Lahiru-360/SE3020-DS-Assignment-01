// ─────────────────────────────────────────────────────────────────────────────
// Patient Service API Layer
//
// All requests are sent through the shared axiosInstance which:
//   • Targets the API Gateway (VITE_API_BASE_URL or http://localhost:5000/api)
//   • Automatically attaches the Bearer JWT token from localStorage
//   • Handles global 401 errors by clearing tokens and redirecting to /login
//
// Backend routes (via API Gateway):
//
// [patient-service]
//   PATCH /patients/me                          — update own profile (patient)
//
// [appointment-service — patient role]
//   GET   /appointments/doctors/search          — search doctors (?specialization=&name=)
//   POST  /appointments                         — book appointment
//   GET   /appointments/my                      — patient's own appointments
//   PATCH /appointments/:id/cancel              — cancel an appointment
//
// [doctor-service — availability (any authenticated)]
//   GET   /availability/:doctorId               — get availability for a doctor
//
// [doctor-service — prescriptions]
//   GET   /prescriptions/patient/:patientId     — patient's prescriptions
//   GET   /prescriptions/:id/pdf                — download PDF as blob
// ─────────────────────────────────────────────────────────────────────────────

import axiosInstance from "./axiosInstance";

// ── Patient Profile ───────────────────────────────────────────────────────

/**
 * Update the patient's own profile.
 * @param {{ firstName?: string, lastName?: string, phone?: string }} data
 */
export const updatePatientProfile = (data) =>
  axiosInstance.patch("/patients/me", data);

// ── Doctor Search ─────────────────────────────────────────────────────────

/**
 * Search approved doctors.
 * @param {{ specialization?: string, name?: string }} params
 */
export const searchDoctors = ({ specialization, name } = {}) => {
  const query = new URLSearchParams();
  if (specialization) query.append("specialization", specialization);
  if (name) query.append("name", name);
  const qs = query.toString();
  return axiosInstance.get(`/appointments/doctors/search${qs ? `?${qs}` : ""}`);
};

// ── Availability ──────────────────────────────────────────────────────────

/**
 * Get a doctor's availability schedule (array of date objects with timeslots).
 * @param {string} doctorId
 */
export const getDoctorAvailability = (doctorId) =>
  axiosInstance.get(`/availability/${doctorId}`);

// ── Appointments ──────────────────────────────────────────────────────────

/**
 * Book an appointment with a doctor.
 * @param {{ doctorId: string, date: string, phase: 'morning'|'evening', notes?: string, type?: 'PHYSICAL'|'VIRTUAL' }} data
 */
export const bookAppointment = (data) =>
  axiosInstance.post("/appointments", data);

/**
 * Get the patient's own appointments.
 */
export const getMyAppointments = () => axiosInstance.get("/appointments/my");

/**
 * Cancel an appointment.
 * @param {string} appointmentId
 */
export const cancelMyAppointment = (appointmentId) =>
  axiosInstance.patch(`/appointments/${appointmentId}/cancel`);

// ── Prescriptions ─────────────────────────────────────────────────────────

/**
 * Get all prescriptions for the logged-in patient.
 * @param {string} patientId — the patient's userId
 */
export const getPatientPrescriptions = (patientId) =>
  axiosInstance.get(`/prescriptions/patient/${patientId}`);

/**
 * Download a prescription as a PDF blob.
 * @param {string} prescriptionId
 */
export const downloadPrescriptionPdf = (prescriptionId) =>
  axiosInstance.get(`/prescriptions/${prescriptionId}/pdf`, {
    responseType: "blob",
  });
