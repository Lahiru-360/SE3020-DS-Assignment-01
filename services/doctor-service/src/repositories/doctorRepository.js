import DoctorModel from "../models/doctorModel.js";

export const createDoctor = (fields) => DoctorModel.create(fields);

export const findDoctorByUserId = (userId) => DoctorModel.findOne({ userId });

export const findDoctorByLicense = (licenseNumber) =>
  DoctorModel.findOne({ licenseNumber });

export const updateDoctorByUserId = (userId, updateData) =>
  DoctorModel.findOneAndUpdate({ userId }, updateData, {
    new: true,
    runValidators: true,
  });

export const findPendingDoctors = () => DoctorModel.find({ isApproved: false });

export const approveDoctorByUserId = (userId) =>
  DoctorModel.findOneAndUpdate({ userId }, { isApproved: true }, { new: true });

export const deleteDoctorByUserId = (userId) =>
  DoctorModel.deleteOne({ userId });
