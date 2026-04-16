import axiosInstance from "./axiosInstance";

// Profile

export const getDoctorProfile = (userId) =>
  axiosInstance.get(`/doctors/profile/${userId}`);

export const updateDoctorProfile = (userId, data) =>
  axiosInstance.put(`/doctors/profile/${userId}`, data);

// Availability

export const getDoctorAvailability = (doctorId) =>
  axiosInstance.get(`/availability/${doctorId}`);

export const addDoctorAvailability = (data) =>
  axiosInstance.post("/availability", data);

export const editDoctorAvailabilitySlot = (doctorId, date, phase, data) =>
  axiosInstance.put(`/availability/${doctorId}/${date}/slots/${phase}`, data);

export const deleteDoctorAvailabilitySlot = (doctorId, date, phase) =>
  axiosInstance.delete(`/availability/${doctorId}/${date}/slots/${phase}`);

// Appointments

export const getDoctorAppointments = () =>
  axiosInstance.get("/appointments/doctor");

export const updateAppointmentStatus = (appointmentId, status) =>
  axiosInstance.patch(`/appointments/${appointmentId}/status`, { status });

export const cancelAppointment = (appointmentId) =>
  axiosInstance.patch(`/appointments/${appointmentId}/cancel`);

// Prescriptions

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
