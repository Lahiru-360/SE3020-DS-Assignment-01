import { Router } from "express";
import {
  uploadReport,
  listReports,
  getReportSignedUrl,
  deleteReport,
} from "../controllers/medicalReportController.js";
import {
  uploadReportValidators,
  reportIdParamValidator,
} from "../validators/medicalReportValidators.js";
import { handleUpload } from "../middleware/uploadMiddleware.js";

const router = Router();

router.post("/me/reports", handleUpload, uploadReportValidators, uploadReport);
router.get("/me/reports", listReports);
router.get(
  "/me/reports/:reportId/url",
  reportIdParamValidator,
  getReportSignedUrl,
);
router.delete("/me/reports/:reportId", reportIdParamValidator, deleteReport);

export default router;
