import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Payment Service: MongoDB connected');
  } catch (error) {
    console.error('Payment Service: MongoDB connection failed', error);
    process.exit(1);
  }
};
