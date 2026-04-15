import { validationResult } from "express-validator";
import {
  addAvailabilityService,
  getDoctorAvailabilitiesService,
  editAvailabilityTimeslotService,
  deleteAvailabilityTimeslotService,
} from "../services/availabilityService.js";
import { sendSuccess, sendError } from "../utils/responseHelper.js";

export const addAvailability = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    // Derive doctorId from verified JWT (set by gateway) to prevent spoofing and ensure consistency with appointment-service queries.
    const doctorId = req.headers['x-user-id'];
    if (!doctorId) return sendError(res, 'Unauthorized', 401);

    const { date, slots } = req.body;
    const availability = await addAvailabilityService(doctorId, date, slots);

    return sendSuccess(
      res,
      availability,
      "Availability added successfully",
      201,
    );
  } catch (e) {
    next(e);
  }
};
export const getAvailabilities = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const { doctorId } = req.params;
    const availabilities = await getDoctorAvailabilitiesService(doctorId);

    return sendSuccess(
      res,
      availabilities,
      "Doctor availabilities fetched successfully",
      200,
    );
  } catch (e) {
    next(e);
  }
};

export const editAvailabilityTimeslot = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const authenticatedDoctorId = req.headers['x-user-id'];
    if (!authenticatedDoctorId) return sendError(res, 'Unauthorized', 401);

    const { doctorId, date, phase } = req.params;

    // Ensure the authenticated doctor can only edit their own availability
    if (doctorId !== authenticatedDoctorId) {
      return sendError(res, 'Forbidden: cannot edit another doctor\'s availability', 403);
    }

    const { indexes } = req.body;

    const updatedAvailability = await editAvailabilityTimeslotService(
      doctorId,
      date,
      phase,
      indexes,
    );

    return sendSuccess(
      res,
      updatedAvailability,
      "Availability timeslot updated successfully",
      200,
    );
  } catch (e) {
    next(e);
  }
};

export const deleteAvailabilityTimeslot = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const authenticatedDoctorId = req.headers['x-user-id'];
    if (!authenticatedDoctorId) return sendError(res, 'Unauthorized', 401);

    const { doctorId, date, phase } = req.params;

    // Ensure the authenticated doctor can only delete their own availability
    if (doctorId !== authenticatedDoctorId) {
      return sendError(res, 'Forbidden: cannot delete another doctor\'s availability', 403);
    }

    const updatedAvailability = await deleteAvailabilityTimeslotService(
      doctorId,
      date,
      phase,
    );

    return sendSuccess(
      res,
      updatedAvailability,
      "Availability timeslot deleted successfully",
      200,
    );
  } catch (e) {
    next(e);
  }
};
