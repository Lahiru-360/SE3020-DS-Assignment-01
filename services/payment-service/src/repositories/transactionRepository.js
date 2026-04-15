import TransactionModel from '../models/Transactionmodel.js';

export const createTransaction = (data) => TransactionModel.create(data);

export const findTransactionById = (id) => TransactionModel.findById(id);

export const findTransactionByAppointmentId = (appointmentId) =>
  TransactionModel.findOne({ appointmentId });

export const findTransactionByStripeIntentId = (stripePaymentIntentId) =>
  TransactionModel.findOne({ stripePaymentIntentId });

export const findTransactionsByPatientId = (patientId) =>
  TransactionModel.find({ patientId }).sort({ createdAt: -1 });

export const updateTransactionById = (id, updates) =>
  TransactionModel.findByIdAndUpdate(id, updates, { new: true });
