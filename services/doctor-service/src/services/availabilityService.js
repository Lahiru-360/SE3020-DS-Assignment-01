import {
  createAvailability,
  findAvailabilityByDoctorAndDate,
  findAvailabilitiesByDoctor,
  updateAvailability,
  deleteAvailabilityByDoctorAndDate,
} from "../repositories/availabilityRepository.js";
import { createHttpError } from "../utils/httpError.js";

const HOURS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

const areConsecutive = (indexes) => {
  if (!Array.isArray(indexes) || indexes.length === 0) return false;
  const sorted = [...indexes].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return false;
    }
  }
  return true;
};

const isWithinPhase = (indexes, phase) => {
  if (!Array.isArray(indexes) || indexes.length === 0) return false;
  const minIndex = Math.min(...indexes);
  const maxIndex = Math.max(...indexes);

  if (phase === "morning") {
    // 06:00 to 12:00 (indexes 0 to 5)
    return minIndex >= 0 && maxIndex <= 5;
  } else if (phase === "evening") {
    // 12:00 to 22:00 (indexes 6 to 15)
    return minIndex >= 6 && maxIndex <= 15;
  }
  return false;
};

export const addAvailabilityService = async (doctorId, date, slots) => {
  // Enforce 0-7 day range using the configured app timezone.
  const tz = process.env.TIMEZONE || "Asia/Colombo";
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // "YYYY-MM-DD"

  const targetDateStr = date.slice(0, 10); // normalise to "YYYY-MM-DD"

  // Direct string comparison works because both are "YYYY-MM-DD"
  if (targetDateStr < todayStr) {
    throw createHttpError("Cannot add availability for past dates.", 400);
  }

  const maxDateStr7 = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  if (targetDateStr > maxDateStr7) {
    throw createHttpError(
      "Doctors can only add availability up to 7 days in advance.",
      400,
    );
  }

  // Check if availability for this date already exists for the doctor
  let existingAvailability = await findAvailabilityByDoctorAndDate(
    doctorId,
    date,
  );

  // If a stale empty document exists (legacy data or a race condition),
  // remove it so we can create a fresh one below.
  if (existingAvailability && existingAvailability.timeslots.length === 0) {
    await deleteAvailabilityByDoctorAndDate(doctorId, date);
    existingAvailability = null;
  }

  if (existingAvailability) {
    // Phase-conflict check: reject only if a requested phase already exists.
    for (const slot of slots) {
      if (existingAvailability.timeslots.some((s) => s.phase === slot.phase)) {
        throw createHttpError(
          `${slot.phase} slot already exists. Use the edit endpoint to update it.`,
          409,
        );
      }
    }
    // Enforce the overall 2-slot cap across the merged set.
    if (existingAvailability.timeslots.length + slots.length > 2) {
      throw createHttpError("Maximum 2 slots allowed per date", 400);
    }
  }

  // Validation Rule 1: Max 2 slots per request
  if (!slots || slots.length > 2) {
    throw createHttpError("Maximum 2 slots allowed", 400);
  }

  // Rule 4: No duplicate phases within this request
  if (slots.length === 2 && slots[0].phase === slots[1].phase) {
    throw createHttpError("Same phase cannot have multiple blocks", 400);
  }

  const timeslots = [];

  for (const slot of slots) {
    const { phase, indexes } = slot;

    // Validation Rule 2
    if (!areConsecutive(indexes)) {
      throw createHttpError("Indexes must be consecutive", 400);
    }

    // Validation Rule 3
    if (!isWithinPhase(indexes, phase)) {
      throw createHttpError("Invalid phase range", 400);
    }

    // Convert Indexes -> Time Range
    const sortedIndexes = [...indexes].sort((a, b) => a - b);
    const firstIndex = sortedIndexes[0];
    const lastIndex = sortedIndexes[sortedIndexes.length - 1];

    const startTime = HOURS[firstIndex];
    const endTime = HOURS[lastIndex + 1];

    timeslots.push({
      startTime,
      endTime,
      phase,
      isBooked: false,
    });
  }

  // If a partial availability document already exists, append new slots to it.
  if (existingAvailability) {
    existingAvailability.timeslots.push(...timeslots);
    await existingAvailability.save();
    return existingAvailability;
  }

  const newAvailability = await createAvailability({
    doctorId,
    date,
    timeslots,
  });

  return newAvailability;
};

export const getDoctorAvailabilitiesService = async (doctorId) => {
  return await findAvailabilitiesByDoctor(doctorId);
};

export const editAvailabilityTimeslotService = async (
  doctorId,
  date,
  phase,
  indexes,
) => {
  const tz = process.env.TIMEZONE || "Asia/Colombo";
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const targetDateStr = date.slice(0, 10);

  if (targetDateStr < todayStr) {
    throw createHttpError("Cannot edit past availability", 400);
  }

  // Find the exact document
  let availabilityDoc = await findAvailabilityByDoctorAndDate(doctorId, date);
  if (!availabilityDoc) {
    throw createHttpError("Availability not found for this date", 404);
  }

  // Validate indexes
  if (!areConsecutive(indexes)) {
    throw createHttpError("Indexes must be consecutive", 400);
  }

  if (!isWithinPhase(indexes, phase)) {
    throw createHttpError("Invalid phase range", 400);
  }

  // Convert Indexes to new Start and End Time
  const sortedIndexes = [...indexes].sort((a, b) => a - b);
  const firstIndex = sortedIndexes[0];
  const lastIndex = sortedIndexes[sortedIndexes.length - 1];

  const startTime = HOURS[firstIndex];
  const endTime = HOURS[lastIndex + 1];

  // Locate the specific timeslot by phase
  const slotIndex = availabilityDoc.timeslots.findIndex(
    (s) => s.phase === phase,
  );

  if (slotIndex !== -1) {
    // Case A: Slot exists
    const slotToUpdate = availabilityDoc.timeslots[slotIndex];

    // Prevent edit if there is already an appointment
    if (slotToUpdate.isBooked) {
      throw createHttpError(
        "Cannot edit a timeslot that is already booked",
        400,
      );
    }

    // Apply change to the specific subdocument
    availabilityDoc.timeslots[slotIndex].startTime = startTime;
    availabilityDoc.timeslots[slotIndex].endTime = endTime;
  } else {
    // Case B: Slot does NOT exist
    if (availabilityDoc.timeslots.length >= 2) {
      throw createHttpError("Maximum 2 slots allowed", 400);
    }

    // Prevent duplicate phase (already handled by slotIndex === -1 check, but good to be explicit based on your prompt requirements)
    const exists = availabilityDoc.timeslots.some((s) => s.phase === phase);
    if (exists) {
      throw createHttpError("Phase already exists", 400);
    }

    availabilityDoc.timeslots.push({
      startTime,
      endTime,
      phase,
      isBooked: false,
    });
  }

  await availabilityDoc.save();

  return availabilityDoc;
};

export const deleteAvailabilityTimeslotService = async (
  doctorId,
  date,
  phase,
) => {
  const tz = process.env.TIMEZONE || "Asia/Colombo";
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const targetDateStr = date.slice(0, 10);

  if (targetDateStr < todayStr) {
    throw createHttpError("Cannot delete past availability", 400);
  }
  // Validate phase
  if (!["morning", "evening"].includes(phase)) {
    throw createHttpError("Invalid phase", 400);
  }

  // Find availability document
  const availabilityDoc = await findAvailabilityByDoctorAndDate(doctorId, date);
  if (!availabilityDoc) {
    throw createHttpError("Availability not found", 404);
  }

  // Find slot by phase
  const slotIndex = availabilityDoc.timeslots.findIndex(
    (s) => s.phase === phase,
  );

  if (slotIndex === -1) {
    throw createHttpError("Slot not found for this phase", 404);
  }

  // Check if booked
  const slot = availabilityDoc.timeslots[slotIndex];
  if (slot.isBooked) {
    throw createHttpError("Cannot delete booked slot", 400);
  }

  // Remove slot
  availabilityDoc.timeslots.splice(slotIndex, 1);

  // If no slots remain, delete the document entirely to prevent it from
  // blocking future POST requests with a spurious 409 conflict.
  if (availabilityDoc.timeslots.length === 0) {
    await deleteAvailabilityByDoctorAndDate(doctorId, date);
    return null;
  }

  // Save changes
  await availabilityDoc.save();

  return availabilityDoc;
};
