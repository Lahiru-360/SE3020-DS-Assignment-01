import axiosInstance from "./axiosInstance";

/**
 * Get or create a telemedicine session for the given appointment.
 * The backend returns a personalized joinUrl based on the caller's role
 * (doctor → moderator, patient → participant). Never expose one role's
 * URL to the other — always rely on this per-user call.
 *
 * Requirements enforced server-side:
 *  - appointment.type must be 'VIRTUAL'
 *  - appointment.status must be 'confirmed'
 *  - caller must be the doctor or patient of that appointment
 *  - current time must fall within 1 hour of the scheduled slot
 *
 * @param {string} appointmentId
 * @returns {Promise<import("axios").AxiosResponse>} data.data = { appointmentId, roomName, status, joinUrl }
 */
export const getOrCreateSession = (appointmentId) =>
  axiosInstance.get(`/telemedicine/sessions/${appointmentId}`);

/**
 * End an active telemedicine session (doctor only).
 *
 * @param {string} appointmentId
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const endSession = (appointmentId) =>
  axiosInstance.post(`/telemedicine/sessions/${appointmentId}/end`);
