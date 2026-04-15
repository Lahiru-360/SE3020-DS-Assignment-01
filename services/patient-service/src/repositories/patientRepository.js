import PatientModel from '../models/patientModel.js';

export const createPatient = (fields) => PatientModel.create(fields);

export const findPatientByUserId = (userId) => PatientModel.findOne({ userId });

export const updatePatientByUserId = (userId, fields) =>
  PatientModel.findOneAndUpdate(
    { userId },
    { $set: fields },
    { new: true, runValidators: true }
  );
