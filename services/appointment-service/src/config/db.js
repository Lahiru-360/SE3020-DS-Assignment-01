import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Appointment Service: MongoDB connected');
  } catch (error) {
    console.error('Appointment Service: MongoDB connection error:', error.message);
    process.exit(1);
  }
};
