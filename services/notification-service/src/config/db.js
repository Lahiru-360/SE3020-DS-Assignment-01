import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Notification Service: MongoDB connected');
  } catch (error) {
    console.error('Notification Service: MongoDB connection error:', error.message);
    process.exit(1);
  }
};
