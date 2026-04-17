import { Router } from "express";
import {
  addAvailability,
  getAvailabilities,
  editAvailabilityTimeslot,
  deleteAvailabilityTimeslot,
  markSlotBooked,
  unmarkSlotBooked,
} from "../controllers/availabilityController.js";
import {
  addAvailabilityValidators,
  getDoctorAvailabilitiesValidators,
  editAvailabilityValidators,
  deleteAvailabilityValidators,
} from "../validators/availabilityValidators.js";
import { requireInternalSecret } from "../middleware/internalAuth.js";

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
router.patch(
  "/internal/:doctorId/:date/slots/:phase/mark-booked",
  requireInternalSecret,
  markSlotBooked,
);
router.patch(
  "/internal/:doctorId/:date/slots/:phase/unmark-booked",
  requireInternalSecret,
  unmarkSlotBooked,
);

export default router;
