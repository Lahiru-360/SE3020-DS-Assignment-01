import TelemedicineSessionModel from '../models/telemedicineModel.js';

export const findSessionByAppointmentId = (appointmentId) =>
  TelemedicineSessionModel.findOne({ appointmentId });

export const findOrCreateSession = (appointmentId, roomName) =>
  TelemedicineSessionModel.findOneAndUpdate(
    { appointmentId },
    { $setOnInsert: { appointmentId, roomName, status: 'CREATED' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

export const createSession = (data) =>
  TelemedicineSessionModel.create(data);

export const updateSessionStatusByAppointmentId = (appointmentId, status) =>
  TelemedicineSessionModel.findOneAndUpdate(
    { appointmentId },
    { status },
    { new: true }
  );
