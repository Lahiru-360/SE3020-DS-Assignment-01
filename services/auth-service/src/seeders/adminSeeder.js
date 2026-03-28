import bcrypt from 'bcryptjs';
import { UserModel } from '../models/userModel.js';

export const seedAdmin = async () => {
  const existing = await UserModel.findOne({ role: 'admin' });
  if (existing) return;

  const email    = process.env.ADMIN_DEFAULT_EMAIL    || 'admin@hospital.com';
  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@1234';

  const hashedPassword = await bcrypt.hash(password, 12);
  await UserModel.create({ email, password: hashedPassword, role: 'admin', isActive: true });

  console.log(`Auth Service: Default admin seeded (${email})`);
};
