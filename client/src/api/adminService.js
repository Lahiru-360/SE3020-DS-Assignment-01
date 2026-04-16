import axiosInstance from "./axiosInstance";

// ── Users ──────────────────────────────────────────────────────────────────

/**
 * Get all users with optional filters + pagination.
 * @param {{ role?: string, isActive?: boolean|string, page?: number, limit?: number, email?: string }} params
 */
export const getAllUsers = (params = {}) =>
  axiosInstance.get("/auth/admin/users", { params });

/**
 * Get a single user by ID.
 * @param {string} userId
 */
export const getUserById = (userId) =>
  axiosInstance.get(`/auth/admin/users/${userId}`);

/**
 * Deactivate a user account.
 * @param {string} userId
 */
export const deactivateUser = (userId) =>
  axiosInstance.patch(`/auth/admin/users/${userId}/deactivate`);

/**
 * Activate a user account.
 * @param {string} userId
 */
export const activateUser = (userId) =>
  axiosInstance.patch(`/auth/admin/users/${userId}/activate`);

/**
 * Permanently delete a user account.
 * @param {string} userId
 */
export const deleteUser = (userId) =>
  axiosInstance.delete(`/auth/admin/users/${userId}`);

// ── Doctor Approval ────────────────────────────────────────────────────────

/**
 * Get all doctors awaiting admin approval.
 */
export const getPendingDoctors = () =>
  axiosInstance.get("/auth/admin/doctors/pending");

/**
 * Approve a pending doctor.
 * @param {string} userId
 */
export const approveDoctor = (userId) =>
  axiosInstance.patch(`/auth/admin/doctors/${userId}/approve`);

/**
 * Reject and remove a pending doctor.
 * @param {string} userId
 */
export const rejectDoctor = (userId) =>
  axiosInstance.delete(`/auth/admin/doctors/${userId}`);

// ── Payments ───────────────────────────────────────────────────────────────

/**
 * Trigger a refund for a given appointment's payment.
 * @param {string} appointmentId
 */
export const refundPayment = (appointmentId) =>
  axiosInstance.post(`/payments/refund/${appointmentId}`);
