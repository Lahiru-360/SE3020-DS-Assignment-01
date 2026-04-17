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
import { findDoctorByUserId } from "../repositories/doctorRepository.js";

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

export const getPrescriptionsByPatientIdService = async (patientId) => {
  const prescriptions = await findPrescriptionsByPatientId(patientId);
  return Promise.all(
    prescriptions.map(async (p) => {
      const doctor = await findDoctorByUserId(p.doctorId).catch(() => null);
      return {
        ...p.toObject(),
        doctorName: doctor
          ? `${doctor.firstName} ${doctor.lastName}`.trim()
          : null,
      };
    }),
  );
};

export const getPrescriptionsByDoctorIdService = async (doctorId) => {
  const prescriptions = await findPrescriptionsByDoctorId(doctorId);
  return Promise.all(
    prescriptions.map(async (p) => {
      let patientName = null;
      try {
        const res = await axios.get(
          `${process.env.PATIENT_SERVICE_URL}/api/patients/internal/${p.patientId}`,
          { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } },
        );
        const patient = res.data?.data;
        if (patient)
          patientName = `${patient.firstName} ${patient.lastName}`.trim();
      } catch {
        // name enrichment is best-effort — ID still present as fallback
      }
      return { ...p.toObject(), patientName };
    }),
  );
};

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

  const doctor = await findDoctorByUserId(prescription.doctorId);

  const patientRes = await axios.get(
    `${process.env.PATIENT_SERVICE_URL}/api/patients/internal/${prescription.patientId}`,
    {
      headers: {
        "x-internal-secret": process.env.INTERNAL_SECRET,
      },
    },
  );

  const patient = patientRes.data?.data;

  if (!doctor) throw createHttpError("Doctor not found", 404);
  if (!patient) throw new Error("Patient not found");

  const doctorName = `${doctor.firstName} ${doctor.lastName}`.trim();
  const doctorSpec = doctor.specialization ?? "";
  const doctorLicense = doctor.licenseNumber ?? "";
  const patientName = `${patient.firstName} ${patient.lastName}`.trim();

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks = [];
  const logoPath = path.join(__dirname, "../assets/logo.png");

  return await new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () =>
      resolve({ buffer: Buffer.concat(chunks), prescription }),
    );
    doc.on("error", reject);

    const PW = doc.page.width; // 595.28
    const PH = doc.page.height; // 841.89
    const M = 50; // side margin
    const CW = PW - 2 * M; // usable content width = 495.28

    // ─────────────────────────────────────────────────────────────────
    // 1. HEADER BAND — full-width deep blue
    // ─────────────────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 130).fill(COLORS.primary);

    try {
      doc.image(logoPath, M, 28, { width: 58 });
    } catch {
      /* optional */
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#ffffff")
      .text("CareLink Health Platform", M + 74, 35, { lineBreak: false });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#8ec6e0")
      .text("Licensed Digital Prescription", M + 74, 63, { lineBreak: false });

    // Right-side prescription metadata
    const issuedStr = new Date(prescription.issuedDate).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );
    const metaW = 185;
    const metaX = PW - M - metaW;

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#8ec6e0")
      .text("PRESCRIPTION ID", metaX, 28, {
        width: metaW,
        align: "right",
        lineBreak: false,
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#ffffff")
      .text(String(prescription._id), metaX, 41, {
        width: metaW,
        align: "right",
        lineBreak: false,
      });
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#8ec6e0")
      .text("DATE ISSUED", metaX, 65, {
        width: metaW,
        align: "right",
        lineBreak: false,
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#ffffff")
      .text(issuedStr, metaX, 78, {
        width: metaW,
        align: "right",
        lineBreak: false,
      });
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#8ec6e0")
      .text(`VERSION  ${prescription.version}`, metaX, 104, {
        width: metaW,
        align: "right",
        lineBreak: false,
      });

    // ─────────────────────────────────────────────────────────────────
    // 2. ACCENT STRIPE — green separator
    // ─────────────────────────────────────────────────────────────────
    doc.rect(0, 130, PW, 5).fill(COLORS.accent);

    // ─────────────────────────────────────────────────────────────────
    // 3. INFO PANEL — doctor | patient two-column layout
    // ─────────────────────────────────────────────────────────────────
    doc.rect(0, 135, PW, 105).fill("#eef3f8");

    // "Rx" stamp (left anchor)
    doc
      .font("Helvetica-Bold")
      .fontSize(36)
      .fillColor(COLORS.primary)
      .text("Rx", M, 156, { width: 44, lineBreak: false });

    // Doctor block
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.textSecondary)
      .text("PRESCRIBING DOCTOR", M + 54, 151, {
        width: 188,
        lineBreak: false,
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(COLORS.textPrimary)
      .text(`Dr. ${doctorName}`, M + 54, 164, { width: 188, lineBreak: false });

    let infoY = 182;
    if (doctorSpec) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.textSecondary)
        .text(doctorSpec, M + 54, infoY, { width: 188, lineBreak: false });
      infoY += 15;
    }
    if (doctorLicense) {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.textSecondary)
        .text(`Reg. No: ${doctorLicense}`, M + 54, infoY, {
          width: 188,
          lineBreak: false,
        });
    }

    // Vertical divider between the two panels
    doc
      .strokeColor("#b8ccdb")
      .moveTo(M + 254, 148)
      .lineTo(M + 254, 228)
      .lineWidth(0.5)
      .stroke();

    // Patient block
    const patX = M + 272;
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.textSecondary)
      .text("PATIENT", patX, 151, { width: 210, lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(COLORS.textPrimary)
      .text(patientName, patX, 164, { width: 210, lineBreak: false });

    // ─────────────────────────────────────────────────────────────────
    // 4. CONTENT AREA
    // ─────────────────────────────────────────────────────────────────
    let y = 263;

    /**
     * Draws a labelled section heading with a 4-pt left accent bar
     * and advances the shared `y` cursor.
     */
    const drawSection = (label) => {
      doc.rect(M, y, 4, 20).fill(COLORS.accent);
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor(COLORS.primary)
        .text(label, M + 14, y + 3, { lineBreak: false });
      y += 32;
    };

    // ── DIAGNOSIS ────────────────────────────────────────────────────
    drawSection("Diagnosis");

    doc.font("Helvetica").fontSize(11);
    const diagH = Math.max(
      44,
      doc.heightOfString(prescription.diagnosis, { width: CW - 26 }) + 18,
    );
    doc.rect(M, y, CW, diagH).fill("#edf5fb");
    doc.rect(M, y, 3, diagH).fill(COLORS.primary);
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(COLORS.textPrimary)
      .text(prescription.diagnosis, M + 14, y + 10, { width: CW - 26 });
    y += diagH + 24;

    // ── MEDICATIONS TABLE ─────────────────────────────────────────────
    drawSection("Medications");

    const COLS = [
      { label: "MEDICATION", x: M, w: 155 },
      { label: "DOSAGE", x: M + 155, w: 100 },
      { label: "FREQUENCY", x: M + 255, w: 130 },
      { label: "DURATION", x: M + 385, w: CW - 385 },
    ];
    const ROW_H = 26;
    const tableTopY = y;

    // Header row
    doc.rect(M, y, CW, ROW_H).fill(COLORS.primary);
    COLS.forEach((col) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#ffffff")
        .text(col.label, col.x + 8, y + 9, {
          width: col.w - 10,
          lineBreak: false,
        });
    });
    y += ROW_H;

    // Data rows
    prescription.medications.forEach((med, i) => {
      doc.rect(M, y, CW, ROW_H).fill(i % 2 === 0 ? "#ffffff" : "#f0f6fb");
      doc
        .strokeColor("#d0e6f4")
        .moveTo(M, y + ROW_H)
        .lineTo(M + CW, y + ROW_H)
        .lineWidth(0.3)
        .stroke();

      const vals = [med.name, med.dosage, med.frequency, med.duration];
      COLS.forEach((col, ci) => {
        doc
          .font(ci === 0 ? "Helvetica-Bold" : "Helvetica")
          .fontSize(9)
          .fillColor(COLORS.textPrimary)
          .text(vals[ci] ?? "—", col.x + 8, y + 9, {
            width: col.w - 12,
            lineBreak: false,
          });
      });
      y += ROW_H;
    });

    // Outer table border
    doc
      .lineWidth(0.5)
      .strokeColor("#b0c8db")
      .rect(M, tableTopY, CW, y - tableTopY)
      .stroke();

    // Vertical column dividers
    [155, 255, 385].forEach((off) => {
      doc
        .strokeColor("#b0c8db")
        .lineWidth(0.3)
        .moveTo(M + off, tableTopY)
        .lineTo(M + off, y)
        .stroke();
    });

    y += 24;

    // ── CLINICAL NOTES (optional) ─────────────────────────────────────
    if (prescription.notes) {
      drawSection("Clinical Notes");

      doc.font("Helvetica").fontSize(10);
      const noteH = Math.max(
        40,
        doc.heightOfString(prescription.notes, { width: CW - 26 }) + 18,
      );
      doc.rect(M, y, CW, noteH).fill("#fffcf0");
      doc.rect(M, y, 3, noteH).fill("#f0a500");
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(COLORS.textSecondary)
        .text(prescription.notes, M + 14, y + 10, { width: CW - 24 });
      y += noteH + 20;
    }

    // ─────────────────────────────────────────────────────────────────
    // 5. FOOTER
    // ─────────────────────────────────────────────────────────────────
    const footerY = PH - 65;

    doc
      .strokeColor(COLORS.border)
      .moveTo(M, footerY)
      .lineTo(PW - M, footerY)
      .lineWidth(0.5)
      .stroke();

    // "DIGITALLY VERIFIED" pill badge
    doc.rect(M, footerY + 10, 106, 16).fill(COLORS.accent);
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor("#ffffff")
      .text("DIGITALLY VERIFIED", M + 4, footerY + 14, {
        width: 98,
        align: "center",
        lineBreak: false,
      });

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.textSecondary)
      .text(
        "This prescription is digitally generated and verified by CareLink Health Platform. " +
          "No handwritten signature is required.",
        M + 114,
        footerY + 13,
        { width: CW - 114, lineBreak: true },
      );

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#8a9eb0")
      .text(
        `Generated: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}  -  Prescription v${prescription.version}`,
        M,
        footerY + 40,
        { width: CW, align: "center", lineBreak: false },
      );

    doc.end();
  });
};
