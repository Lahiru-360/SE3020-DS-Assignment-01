import DoctorModel from '../models/doctorModel.js';

export const createDoctor = (fields) => DoctorModel.create(fields);

export const findDoctorByUserId = (userId) => DoctorModel.findOne({ userId });

export const findDoctorByLicense = (licenseNumber) => DoctorModel.findOne({ licenseNumber });
