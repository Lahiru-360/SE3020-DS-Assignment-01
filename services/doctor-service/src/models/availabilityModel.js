import mongoose from "mongoose";

const AvailabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: String, // String to match either userId or doctor's _id depending on your auth/token design
      required: true,
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    timeslots: [
      {
        startTime: {
          type: String, // Format: HH:mm (e.g., '09:00')
          required: true,
        },
        endTime: {
          type: String, // Format: HH:mm (e.g., '10:00')
          required: true,
        },
        phase: {
          type: String,
          enum: ["morning", "evening"],
        },
        isBooked: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { timestamps: true },
);

// Prevent a doctor from having multiple availability documents for the exact same date
AvailabilitySchema.index({ doctorId: 1, date: 1 }, { unique: true });

const AvailabilityModel = mongoose.model("Availability", AvailabilitySchema);

export default AvailabilityModel;
