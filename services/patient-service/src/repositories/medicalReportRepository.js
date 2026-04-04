import MedicalReportModel from '../models/medicalReportModel.js';

export const createReport = (fields) =>
  MedicalReportModel.create(fields);

export const findReportsByPatientId = (patientId) =>
  MedicalReportModel.find({ patientId }).sort({ createdAt: -1 });

export const findReportById = (reportId) =>
  MedicalReportModel.findById(reportId);

export const deleteReportById = (reportId) =>
  MedicalReportModel.findByIdAndDelete(reportId);
