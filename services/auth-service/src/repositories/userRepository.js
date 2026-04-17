import { UserModel } from '../models/userModel.js';

export const findUserByEmail = (email) => UserModel.findOne({ email });

export const findUserById = (id) => UserModel.findById(id);

export const createUser = (userData) => UserModel.create(userData);

export const saveUser = (user) => user.save();

export const deleteUserById = (id) => UserModel.deleteOne({ _id: id });

export const findAllUsers = (filter = {}, skip = 0, limit = 20) =>
  UserModel.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

export const countUsers = (filter = {}) => UserModel.countDocuments(filter);
