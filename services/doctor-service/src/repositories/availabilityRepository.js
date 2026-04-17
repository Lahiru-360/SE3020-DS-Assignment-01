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

export const markPhaseAsBooked = (doctorId, date, phase) =>
  AvailabilityModel.findOneAndUpdate(
    { doctorId, date, "timeslots.phase": phase },
    { $set: { "timeslots.$.isBooked": true } },
    { new: true },
  );

export const unmarkPhaseAsBooked = (doctorId, date, phase) =>
  AvailabilityModel.findOneAndUpdate(
    { doctorId, date, "timeslots.phase": phase },
    { $set: { "timeslots.$.isBooked": false } },
    { new: true },
  );
