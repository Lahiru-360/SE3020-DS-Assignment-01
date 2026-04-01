import PaymentModel from '../models/paymentModel.js';

export const createPayment = (data) => PaymentModel.create(data);

export const findPaymentByIntentId = (stripePaymentIntentId) =>
  PaymentModel.findOne({ stripePaymentIntentId });

export const findPaymentById = (id) => PaymentModel.findById(id);

export const findPaymentByAppointmentId = (appointmentId) =>
  PaymentModel.findOne({ appointmentId });

export const findPaymentsByPatientId = (patientId) =>
  PaymentModel.find({ patientId }).sort({ createdAt: -1 });

export const savePayment = (payment) => payment.save();
