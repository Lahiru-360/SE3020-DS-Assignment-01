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

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks = [];

  return await new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () =>
      resolve({ buffer: Buffer.concat(chunks), prescription }),
    );
    doc.on("error", (error) => reject(error));

    doc.fontSize(18).text("Prescription", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Prescription ID: ${prescription._id}`);
    doc.text(`Doctor ID: ${prescription.doctorId}`);
    doc.text(`Patient ID: ${prescription.patientId}`);
    doc.text(`Appointment ID: ${prescription.appointmentId}`);
    doc.text(`Issued Date: ${new Date(prescription.issuedDate).toISOString()}`);
    doc.text(`Version: ${prescription.version}`);
    doc.text(
      `Last Updated: ${
        prescription.lastUpdated
          ? new Date(prescription.lastUpdated).toISOString()
          : "N/A"
      }`,
    );

    doc.moveDown();
    doc.fontSize(13).text("Diagnosis", { underline: true });
    doc.fontSize(12).text(prescription.diagnosis);

    doc.moveDown();
    doc.fontSize(13).text("Medications", { underline: true });
    prescription.medications.forEach((medication, index) => {
      doc
        .fontSize(12)
        .text(
          `${index + 1}. ${medication.name} | Dosage: ${medication.dosage} | Frequency: ${medication.frequency} | Duration: ${medication.duration}`,
        );
    });

    if (prescription.notes) {
      doc.moveDown();
      doc.fontSize(13).text("Notes", { underline: true });
      doc.fontSize(12).text(prescription.notes);
    }

    doc.end();
  });
};
