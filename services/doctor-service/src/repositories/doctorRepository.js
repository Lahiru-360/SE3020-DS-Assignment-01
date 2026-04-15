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

// ─── Internal search (called by appointment-service) ─────────────────────────
export const searchDoctors = ({ specialization, name } = {}) => {
  const filter = { isApproved: true };

  if (specialization) {
    filter.specialization = { $regex: specialization, $options: "i" };
  }

  if (name) {
    const nameRegex = { $regex: name, $options: "i" };
    filter.$or = [{ firstName: nameRegex }, { lastName: nameRegex }];
  }

  return DoctorModel.find(filter, {
    userId: 1,
    firstName: 1,
    lastName: 1,
    specialization: 1,
    phone: 1,
  });
};
