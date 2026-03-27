import { UserModel } from '../models/userModel.js';

export const findUserByEmail = (email) => UserModel.findOne({ email });

export const findUserById = (id) => UserModel.findById(id);

export const createUser = (userData) => UserModel.create(userData);

export const saveUser = (user) => user.save();

export const deleteUserById = (id) => UserModel.deleteOne({ _id: id });
