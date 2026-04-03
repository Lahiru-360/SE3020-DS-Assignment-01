// ─────────────────────────────────────────────────────────────────────────────
// Appointment Routes
//
// All routes in this file are reached via the API Gateway which has already:
//   1. Verified the JWT
//   2. Injected x-user-id, x-user-role, x-user-email into the request headers
//
// Role enforcement is done at the gateway level for public-facing routes.
// Internal routes are protected by internalAuth middleware.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  cancelAppointment,
  updateAppointmentStatus,
  searchDoctors,
  getAvailableSlots,
} from '../controllers/appointmentController.js';
import {
  bookAppointmentValidators,
  updateStatusValidators,
  searchDoctorsValidators,
  getAvailableSlotsValidators,
} from '../validators/appointmentValidators.js';

const router = Router();

// ── Patient-facing ────────────────────────────────────────────────────────────
router.get('/doctors/search', searchDoctorsValidators,     searchDoctors);
router.get('/slots',          getAvailableSlotsValidators, getAvailableSlots);
router.post('/',              bookAppointmentValidators,   bookAppointment);
router.get('/my',             getMyAppointments);

// ── Doctor-facing ─────────────────────────────────────────────────────────────
router.get('/doctor',  getDoctorAppointments);
router.patch('/:id/status', updateStatusValidators, updateAppointmentStatus);

// ── Shared (patient or doctor) ────────────────────────────────────────────────
router.patch('/:id/cancel', cancelAppointment);

export default router;

