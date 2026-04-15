import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { patientRouter } from "./patient.routes.js";
import { doctorRouter } from "./doctor.routes.js";
import { availabilityRouter } from "./availability.routes.js";
import { appointmentRouter } from "./appointment.routes.js";
import { telemedicineRouter } from "./telemedicine.routes.js";
import { paymentRouter } from "./payment.routes.js";
import { aiRouter } from "./ai.routes.js";

const router = Router();

router.use(authRouter);
router.use(patientRouter);
router.use(doctorRouter);
router.use(availabilityRouter);
router.use(appointmentRouter);
router.use(telemedicineRouter);
router.use(paymentRouter);
router.use(aiRouter);

export default router;

