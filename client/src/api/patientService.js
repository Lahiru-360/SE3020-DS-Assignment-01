import axiosInstance from "./axiosInstance";

// Patient Profile

/**
 * Get the patient's own profile.
 */
export const getPatientProfile = () => axiosInstance.get("/patients/me");

/**
 * Update the patient's own profile.
 * @param {{ firstName?: string, lastName?: string, phone?: string }} data
 */
export const updatePatientProfile = (data) =>
  axiosInstance.patch("/patients/me", data);

// Doctor Search

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

// Availability

/**
 * Get a doctor's availability schedule (array of date objects with timeslots).
 * @param {string} doctorId
 */
export const getDoctorAvailability = (doctorId) =>
  axiosInstance.get(`/availability/${doctorId}`);

//  Appointments

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

//  Prescriptions

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

// Payments

/**
 * Initiate a Stripe payment intent for an appointment.
 * @param {string} appointmentId
 */
export const createPaymentIntent = (appointmentId) =>
  axiosInstance.post("/payments/create-intent", { appointmentId });

/**
 * Get the patient's own payment/transaction history.
 */
export const getMyPayments = () => axiosInstance.get("/payments/my");

// AI Smart Match

/**
 * Analyze symptoms and get a doctor specialty recommendation + matched doctors.
 * @param {string} symptoms — plain-text description (10–2000 chars)
 */
export const analyzeSymptoms = (symptoms) =>
  axiosInstance.post("/ai/analyze", { symptoms });
