import mongoose from 'mongoose';


const MedicalReportSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

const MedicalReportModel = mongoose.model('MedicalReport', MedicalReportSchema);

export default MedicalReportModel;
