import AvailabilityModel from "../models/availabilityModel.js";

export const createAvailability = (data) => AvailabilityModel.create(data);

export const findAvailabilityByDoctorAndDate = (doctorId, date) =>
  AvailabilityModel.findOne({ doctorId, date });

export const findAvailabilitiesByDoctor = (doctorId) =>
  AvailabilityModel.find({ doctorId });

export const updateAvailability = (id, data) =>
  AvailabilityModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

export const deleteAvailabilityByDoctorAndDate = (doctorId, date) =>
  AvailabilityModel.deleteOne({ doctorId, date });
