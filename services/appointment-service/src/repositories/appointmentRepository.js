import AppointmentModel from '../models/appointmentModel.js';

export const createAppointment = (data) => AppointmentModel.create(data);

export const findAppointmentById = (id) => AppointmentModel.findById(id);

export const findAppointmentsByPatientId = (patientId) =>
  AppointmentModel.find({ patientId }).sort({ date: -1 });

export const findAppointmentsByDoctorId = (doctorId) =>
  AppointmentModel.find({ doctorId }).sort({ date: -1 });

export const updateAppointmentById = (id, updates) =>
  AppointmentModel.findByIdAndUpdate(id, updates, { new: true });
