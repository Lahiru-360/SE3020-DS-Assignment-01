import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Configure dotenv
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/doctor-service';

const DoctorSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, default: null },
  specialization: { type: String, required: true },
  licenseNumber: { type: String, required: true, unique: true },
  consultationFee: { type: Number, required: true },
  isApproved: { type: Boolean, default: false },
}, { timestamps: true });

const Doctor = mongoose.model('Doctor', DoctorSchema);

const sampleDoctors = [
  {
    userId: 'user_gp_1',
    email: 'john.gp@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '0771234567',
    specialization: 'General Physician',
    licenseNumber: 'SLMC/GP/001',
    consultationFee: 1500,
    isApproved: true
  },
  {
    userId: 'user_gp_2',
    email: 'jane.gp@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '0777654321',
    specialization: 'General Physician',
    licenseNumber: 'SLMC/GP/002',
    consultationFee: 1800,
    isApproved: true
  },
  {
    userId: 'user_cardio_1',
    email: 'robert.cardio@example.com',
    firstName: 'Robert',
    lastName: 'Brown',
    phone: '0771112223',
    specialization: 'Cardiologist',
    licenseNumber: 'SLMC/C/001',
    consultationFee: 3500,
    isApproved: true
  },
  {
    userId: 'user_cardio_2',
    email: 'alice.cardio@example.com',
    firstName: 'Alice',
    lastName: 'White',
    phone: '0774445556',
    specialization: 'Cardiologist',
    licenseNumber: 'SLMC/C/002',
    consultationFee: 4000,
    isApproved: true
  },
  {
    userId: 'user_neuro_1',
    email: 'samuel.neuro@example.com',
    firstName: 'Samuel',
    lastName: 'Green',
    phone: '0773334445',
    specialization: 'Neurologist',
    licenseNumber: 'SLMC/N/001',
    consultationFee: 4500,
    isApproved: true
  },
  {
    userId: 'user_neuro_2',
    email: 'ellie.neuro@example.com',
    firstName: 'Ellie',
    lastName: 'Grey',
    phone: '0775556667',
    specialization: 'Neurologist',
    licenseNumber: 'SLMC/N/002',
    consultationFee: 5000,
    isApproved: true
  },
  {
    userId: 'user_derm_1',
    email: 'david.derm@example.com',
    firstName: 'David',
    lastName: 'Clark',
    phone: '0776667778',
    specialization: 'Dermatologist',
    licenseNumber: 'SLMC/D/001',
    consultationFee: 2500,
    isApproved: true
  },
  {
    userId: 'user_ortho_1',
    email: 'sarah.ortho@example.com',
    firstName: 'Sarah',
    lastName: 'Lee',
    phone: '0778889990',
    specialization: 'Orthopedic',
    licenseNumber: 'SLMC/O/001',
    consultationFee: 3000,
    isApproved: true
  }
];

const seed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    console.log('Clearing existing doctors...');
    await Doctor.deleteMany({ userId: { $regex: /^user_/ } }); // only clear sample data
    
    console.log(`Inserting ${sampleDoctors.length} doctors...`);
    await Doctor.insertMany(sampleDoctors);
    
    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
