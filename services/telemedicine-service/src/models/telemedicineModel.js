import mongoose from 'mongoose';

const TelemedicineSessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    roomName: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['CREATED', 'ACTIVE', 'ENDED'],
      default: 'CREATED',
    },
  },
  { timestamps: true }
);

const TelemedicineSessionModel = mongoose.model(
  'TelemedicineSession',
  TelemedicineSessionSchema
);

export default TelemedicineSessionModel;
