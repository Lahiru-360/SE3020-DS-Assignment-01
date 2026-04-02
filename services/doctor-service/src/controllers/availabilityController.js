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

    const { doctorId, date, slots } = req.body;
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

    const { doctorId, date, phase } = req.params;
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

    const { doctorId, date, phase } = req.params;

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
