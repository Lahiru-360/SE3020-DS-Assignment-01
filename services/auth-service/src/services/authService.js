import bcrypt from "bcryptjs";
import axios from "axios";

import {
  findUserByEmail,
  findUserById,
  createUser,
  saveUser,
  deleteUserById,
  findAllUsers,
  countUsers,
} from "../repositories/userRepository.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "../utils/tokenHelper.js";
import { createHttpError } from "../utils/httpError.js";

const buildTokenPayload = (user) => ({
  userId: user._id.toString(),
  email: user.email,
  role: user.role,
});

const buildUserResponse = (user) => ({
  userId: user._id,
  email: user.email,
  role: user.role,
  refId: user.refId,
});

const signTokenPair = (payload) => ({
  accessToken: signAccessToken(payload),
  refreshToken: signRefreshToken(payload),
});

// Shared registration flow — only role and downstream service differ.
const registerUser = async (
  role,
  serviceUrl,
  apiPath,
  { email, password, ...profileFields },
) => {
  const existing = await findUserByEmail(email);
  if (existing) throw createHttpError("Email already in use", 409);

  // Doctors are inactive until an admin approves them.
  const isActive = role !== "doctor";
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await createUser({
    email,
    password: hashedPassword,
    role,
    isActive,
  });

  let refId = null;
  try {
    const { data: profileResponse } = await axios.post(
      `${serviceUrl}${apiPath}`,
      { userId: user._id.toString(), email, ...profileFields },
      { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } },
    );
    refId = profileResponse.data?._id ?? null;
  } catch (err) {
    await deleteUserById(user._id);

    if (err.response) {
      throw createHttpError(
        err.response.data?.message ?? "Registration failed",
        err.response.status,
      );
    }
    const label = role === "patient" ? "Patient" : "Doctor";
    throw createHttpError(
      `${label} service unavailable. Please try again later.`,
      503,
    );
  }

  user.refId = refId;
  await saveUser(user);

  return { user: buildUserResponse(user) };
};

export const registerPatientService = (fields) =>
  registerUser(
    "patient",
    process.env.PATIENT_SERVICE_URL,
    "/api/patients/profile",
    fields,
  );

export const registerDoctorService = (fields) =>
  registerUser(
    "doctor",
    process.env.DOCTOR_SERVICE_URL,
    "/api/doctors/profile",
    fields,
  );

export const loginService = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) throw createHttpError("Invalid credentials", 401);

  if (!user.isActive) {
    const message =
      user.role === "doctor"
        ? "Your account is pending admin approval."
        : "Account is deactivated. Contact support.";
    throw createHttpError(message, 403);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) throw createHttpError("Invalid credentials", 401);

  user.lastLogin = new Date();
  await saveUser(user);

  const tokens = signTokenPair(buildTokenPayload(user));
  return { ...tokens, user: buildUserResponse(user) };
};

export const refreshTokenService = (token) => {
  if (!token) throw createHttpError("Refresh token is required", 400);

  const decoded = verifyToken(token);
  if (!decoded) throw createHttpError("Invalid or expired refresh token", 401);

  const accessToken = signAccessToken({
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  });

  return { accessToken };
};

export const logoutService = () => {
  return null;
};

export const getPendingDoctorsService = async () => {
  const { data } = await axios.get(
    `${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/pending`,
    { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } },
  );
  return data.data;
};

export const approveDoctorService = async (userId) => {
  const user = await findUserById(userId);
  if (!user || user.role !== "doctor")
    throw createHttpError("Doctor user not found", 404);

  try {
    await axios.patch(
      `${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/${userId}/approve`,
      {},
      { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } },
    );
  } catch {
    throw createHttpError(
      "Doctor service unavailable. Please try again later.",
      503,
    );
  }

  user.isActive = true;
  await saveUser(user);
};

export const rejectDoctorService = async (userId) => {
  const user = await findUserById(userId);
  if (!user || user.role !== "doctor")
    throw createHttpError("Doctor user not found", 404);

  try {
    await axios.delete(
      `${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/${userId}`,
      { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } },
    );
  } catch {
    throw createHttpError(
      "Doctor service unavailable. Please try again later.",
      503,
    );
  }

  await deleteUserById(userId);
};

export const getAllUsersService = async ({
  role,
  isActive,
  page = 1,
  limit = 20,
  email,
} = {}) => {
  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined && isActive !== "")
    filter.isActive = isActive === "true" || isActive === true;
  if (email)
    filter.email = {
      $regex: email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };

  const parsedPage  = Math.max(1, parseInt(page,  10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip        = (parsedPage - 1) * parsedLimit;

  const [users, total] = await Promise.all([
    findAllUsers(filter, skip, parsedLimit),
    countUsers(filter),
  ]);

  return {
    users,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(total / parsedLimit),
  };
};

export const getUserByIdService = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throw createHttpError("User not found", 404);
  const { password: _pw, ...safeUser } = user.toObject();
  return safeUser;
};

export const deactivateUserService = async (userId, requestingAdminId) => {
  if (userId === requestingAdminId)
    throw createHttpError("Cannot deactivate your own account", 400);
  const user = await findUserById(userId);
  if (!user) throw createHttpError("User not found", 404);
  if (user.role === "admin")
    throw createHttpError("Cannot deactivate an admin account", 403);
  if (!user.isActive)
    throw createHttpError("User account is already inactive", 409);
  user.isActive = false;
  await saveUser(user);
};

export const activateUserService = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throw createHttpError("User not found", 404);
  if (user.isActive)
    throw createHttpError("User account is already active", 409);
  user.isActive = true;
  await saveUser(user);
};

export const deleteUserService = async (userId, requestingAdminId) => {
  if (userId === requestingAdminId)
    throw createHttpError("Cannot delete your own account", 400);
  const user = await findUserById(userId);
  if (!user) throw createHttpError("User not found", 404);
  if (user.role === "admin")
    throw createHttpError("Cannot delete an admin account", 403);

  if (user.role === "patient") {
    try {
      await axios.delete(
        `${process.env.PATIENT_SERVICE_URL}/api/patients/internal/${userId}`,
        { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } },
      );
    } catch { /* non-fatal */ }
  }

  if (user.role === "doctor") {
    try {
      await axios.delete(
        `${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/${userId}`,
        { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } },
      );
    } catch { /* non-fatal */ }
  }

  await deleteUserById(userId);
};
