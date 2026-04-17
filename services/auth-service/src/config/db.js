import mongoose from 'mongoose';
import { seedAdmin } from '../seeders/adminSeeder.js';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Auth Service: MongoDB connected');
    await seedAdmin();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
