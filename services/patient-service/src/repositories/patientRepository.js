import PatientModel from '../models/patientModel.js';

export const createPatient = (fields) => PatientModel.create(fields);

export const findPatientByUserId = (userId) => PatientModel.findOne({ userId });
