import mongoose from 'mongoose';

// Stores the patient profile created by auth-service during registration.
// userId is the _id from auth-service's users collection — the canonical link
// between the identity record and the profile record.
const PatientSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const PatientModel = mongoose.model('Patient', PatientSchema);

export default PatientModel;
