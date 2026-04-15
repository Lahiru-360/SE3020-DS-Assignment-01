import PrescriptionModel from "../models/prescriptionModel.js";

export const createPrescription = (payload) =>
  PrescriptionModel.create(payload);

export const findPrescriptionById = (id) => PrescriptionModel.findById(id);

export const findPrescriptionByAppointmentId = (appointmentId) =>
  PrescriptionModel.findOne({ appointmentId });

export const findPrescriptionsByPatientId = (patientId) =>
  PrescriptionModel.find({ patientId }).sort({ issuedDate: -1 });

export const findPrescriptionsByDoctorId = (doctorId) =>
  PrescriptionModel.find({ doctorId }).sort({ issuedDate: -1 });

export const updatePrescriptionById = (id, updateData) =>
  PrescriptionModel.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
