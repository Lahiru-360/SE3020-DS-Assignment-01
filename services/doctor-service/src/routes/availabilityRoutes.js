import { Router } from "express";
import {
  addAvailability,
  getAvailabilities,
  editAvailabilityTimeslot,
  deleteAvailabilityTimeslot,
} from "../controllers/availabilityController.js";
import {
  addAvailabilityValidators,
  getDoctorAvailabilitiesValidators,
  editAvailabilityValidators,
  deleteAvailabilityValidators,
} from "../validators/availabilityValidators.js";

const router = Router();

router.post("/", addAvailabilityValidators, addAvailability);
router.get("/:doctorId", getDoctorAvailabilitiesValidators, getAvailabilities);
router.put(
  "/:doctorId/:date/slots/:phase",
  editAvailabilityValidators,
  editAvailabilityTimeslot,
);
router.delete(
  "/:doctorId/:date/slots/:phase",
  deleteAvailabilityValidators,
  deleteAvailabilityTimeslot,
);

export default router;
