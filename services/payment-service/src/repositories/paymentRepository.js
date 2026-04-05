import PaymentModel from '../models/paymentModel.js';

export const createPayment = (data) => PaymentModel.create(data);

export const findPaymentByIntentId = (stripePaymentIntentId) =>
  PaymentModel.findOne({ stripePaymentIntentId });

export const findPaymentByAppointmentId = (appointmentId) =>
  PaymentModel.findOne({ appointmentId });

export const updatePaymentByIntentId = (stripePaymentIntentId, updates) =>
  PaymentModel.findOneAndUpdate(
    { stripePaymentIntentId },
    updates,
    { new: true }
  );

export const updatePaymentByAppointmentId = (appointmentId, updates) =>
  PaymentModel.findOneAndUpdate(
    { appointmentId },
    updates,
    { new: true }
  );
