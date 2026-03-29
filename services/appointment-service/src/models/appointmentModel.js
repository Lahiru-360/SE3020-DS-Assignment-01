import mongoose from 'mongoose';

// Denormalized fields (patientName, doctorName, etc.) are stored at booking time
// to avoid cross-service lookups on every read.
const AppointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    patientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    doctorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    specialty: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

const AppointmentModel = mongoose.model('Appointment', AppointmentSchema);

export default AppointmentModel;
