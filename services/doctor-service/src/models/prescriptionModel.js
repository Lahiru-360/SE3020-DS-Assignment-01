import mongoose from "mongoose";

const MedicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const PrescriptionSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      required: true,
      trim: true,
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    medications: {
      type: [MedicationSchema],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one medication is required",
      },
    },
    notes: {
      type: String,
      default: null,
      trim: true,
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: false },
);

const PrescriptionModel = mongoose.model("Prescription", PrescriptionSchema);

export default PrescriptionModel;
