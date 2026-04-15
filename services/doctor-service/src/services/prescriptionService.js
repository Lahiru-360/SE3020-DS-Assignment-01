import axios from "axios";
import PDFDocument from "pdfkit";
import {
  createPrescription,
  findPrescriptionByAppointmentId,
  findPrescriptionsByDoctorId,
  findPrescriptionById,
  findPrescriptionsByPatientId,
  updatePrescriptionById,
} from "../repositories/prescriptionRepository.js";
import { createHttpError } from "../utils/httpError.js";
import path from "path";
import { fileURLToPath } from "url";
import DoctorModel from "../models/doctorModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
  primary: "#1a6fa8",
  accent: "#27ae7a",
  textPrimary: "#1e2b38",
  textSecondary: "#4f6578",
  border: "#d6e8f2",
};

const APPOINTMENT_SERVICE_URL =
  process.env.APPOINTMENT_SERVICE_URL || "http://appointment-service:5003";

const getAppointmentById = async (appointmentId) => {
  try {
    const response = await axios.get(
      `${APPOINTMENT_SERVICE_URL}/api/appointments/internal/${appointmentId}`,
      {
        headers: {
          "x-internal-secret": process.env.INTERNAL_SECRET,
        },
      },
    );

    return response?.data?.data || null;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    throw createHttpError("Unable to validate appointment details", 502);
  }
};

export const createPrescriptionService = async ({
  doctorId,
  patientId,
  appointmentId,
  diagnosis,
  medications,
  notes,
}) => {
  const existing = await findPrescriptionByAppointmentId(appointmentId);
  if (existing) {
    throw createHttpError(
      "Prescription already exists for this appointment",
      409,
    );
  }

  const appointment = await getAppointmentById(appointmentId);

  if (!appointment) {
    throw createHttpError("Appointment not found", 404);
  }

  if (appointment.status !== "completed") {
    throw createHttpError(
      "Prescription can only be created for completed appointments",
      400,
    );
  }

  if (appointment.doctorId !== doctorId) {
    throw createHttpError("doctorId does not match appointment", 400);
  }

  if (appointment.patientId !== patientId) {
    throw createHttpError("patientId does not match appointment", 400);
  }

  try {
    return await createPrescription({
      doctorId,
      patientId,
      appointmentId,
      diagnosis,
      medications,
      notes: notes ?? null,
      issuedDate: new Date(),
      version: 1,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw createHttpError(
        "Prescription already exists for this appointment",
        409,
      );
    }

    throw error;
  }
};

export const updatePrescriptionService = async (id, updateFields) => {
  const existing = await findPrescriptionById(id);
  if (!existing) throw createHttpError("Prescription not found", 404);

  const sanitizedUpdate = {};
  if (updateFields.diagnosis !== undefined) {
    sanitizedUpdate.diagnosis = updateFields.diagnosis;
  }
  if (updateFields.medications !== undefined) {
    sanitizedUpdate.medications = updateFields.medications;
  }
  if (Object.prototype.hasOwnProperty.call(updateFields, "notes")) {
    sanitizedUpdate.notes = updateFields.notes;
  }

  const updated = await updatePrescriptionById(id, {
    ...sanitizedUpdate,
    lastUpdated: new Date(),
    version: existing.version + 1,
  });

  return updated;
};

export const getPrescriptionByIdService = async (id) => {
  const prescription = await findPrescriptionById(id);
  if (!prescription) throw createHttpError("Prescription not found", 404);
  return prescription;
};

const ensurePrescriptionAccess = (prescription, requesterId) => {
  if (
    requesterId !== prescription.doctorId &&
    requesterId !== prescription.patientId
  ) {
    throw createHttpError(
      "Forbidden: You are not allowed to access this prescription",
      403,
    );
  }
};

export const getPrescriptionByIdForUserService = async (id, requesterId) => {
  const prescription = await getPrescriptionByIdService(id);
  ensurePrescriptionAccess(prescription, requesterId);
  return prescription;
};

export const getPrescriptionsByPatientIdService = async (patientId) =>
  findPrescriptionsByPatientId(patientId);

export const getPrescriptionsByDoctorIdService = async (doctorId) =>
  findPrescriptionsByDoctorId(doctorId);

export const verifyPrescriptionService = async (id) => {
  const prescription = await findPrescriptionById(id);
  if (!prescription) throw createHttpError("Prescription not found", 404);

  return {
    _id: prescription._id,
    doctorId: prescription.doctorId,
    patientId: prescription.patientId,
    appointmentId: prescription.appointmentId,
    diagnosis: prescription.diagnosis,
    medications: prescription.medications,
    notes: prescription.notes,
    version: prescription.version,
    issuedDate: prescription.issuedDate,
    lastUpdated: prescription.lastUpdated,
  };
};

export const generatePrescriptionPdfForUserService = async (
  id,
  requesterId,
) => {
  const prescription = await getPrescriptionByIdForUserService(id, requesterId);

  const doctor = await DoctorModel.findById(prescription.doctorId);

  const patientRes = await axios.get(
    `${process.env.PATIENT_SERVICE_URL}/api/patients/internal/${prescription.patientId}`,
    {
      headers: {
        "x-internal-secret": process.env.INTERNAL_SECRET,
      },
    },
  );
  console.log("Patient API response:", patientRes.data);

  const patient = patientRes.data?.data;

  if (!doctor) throw new Error("Doctor not found");
  if (!patient) throw new Error("Patient not found");

  const doctorName = `${doctor.firstName} ${doctor.lastName}`.trim();
  const patientName = `${patient.firstName} ${patient.lastName}`.trim();

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks = [];

  const logoPath = path.join(__dirname, "../assets/logo.png");

  return await new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () =>
      resolve({ buffer: Buffer.concat(chunks), prescription }),
    );
    doc.on("error", reject);

    // ───────────────── HEADER ─────────────────
    doc.image(logoPath, 50, 40, { width: 50 });

    doc
      .fontSize(20)
      .fillColor(COLORS.primary)
      .text("SafeMother Health Platform", 110, 45);

    doc
      .fontSize(10)
      .fillColor(COLORS.textSecondary)
      .text("Digital Prescription System", 110, 70);

    doc.moveDown(2);

    // Divider
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(COLORS.border);

    doc.moveDown();

    // ───────────────── DETAILS ─────────────────
    doc.fontSize(12).fillColor(COLORS.textPrimary);

    doc.text(`Prescription ID: ${prescription._id}`);
    doc.text(
      `Issued Date: ${new Date(prescription.issuedDate).toDateString()}`,
    );
    doc.text(`Version: ${prescription.version}`);

    doc.moveDown();

    doc.font("Helvetica-Bold").text("Doctor:");
    doc.font("Helvetica").text(`Dr. ${doctorName || "Unknown"}`);

    doc.moveDown(0.5);

    doc.font("Helvetica-Bold").text("Patient:");
    doc.font("Helvetica").text(`${patientName || "Unknown"}`);

    doc.moveDown();

    // ───────────────── DIAGNOSIS ─────────────────
    doc
      .fontSize(14)
      .fillColor(COLORS.primary)
      .text("Diagnosis", { underline: true });

    doc.fontSize(12).fillColor(COLORS.textPrimary).text(prescription.diagnosis);

    doc.moveDown();

    // ───────────────── MEDICATION TABLE ─────────────────
    doc
      .fontSize(14)
      .fillColor(COLORS.primary)
      .text("Medications", { underline: true });

    doc.moveDown(0.5);

    // Table Header
    doc.font("Helvetica-Bold").fontSize(11);

    const startY = doc.y;

    doc.text("Name", 50, startY);
    doc.text("Dosage", 150, startY);
    doc.text("Frequency", 250, startY);
    doc.text("Duration", 380, startY);

    doc.moveDown(0.5);

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(COLORS.border);

    doc.moveDown(0.5);

    // Table Rows
    doc.font("Helvetica").fontSize(11);

    prescription.medications.forEach((med) => {
      const y = doc.y;

      doc.text(med.name, 50, y);
      doc.text(med.dosage, 150, y);
      doc.text(med.frequency, 250, y);
      doc.text(med.duration, 380, y);

      doc.moveDown();
    });

    doc.moveDown();

    // ───────────────── NOTES ─────────────────
    if (prescription.notes) {
      doc
        .fontSize(14)
        .fillColor(COLORS.primary)
        .text("Notes", { underline: true });

      doc.fontSize(12).fillColor(COLORS.textPrimary).text(prescription.notes);

      doc.moveDown();
    }

    // ───────────────── FOOTER ─────────────────
    doc.moveDown(2);

    doc
      .fontSize(10)
      .fillColor(COLORS.textSecondary)
      .text(
        "This is a digitally generated prescription. No signature required.",
        { align: "center" },
      );

    doc.end();
  });
};
