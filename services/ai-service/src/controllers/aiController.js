import { analyzeSymptoms } from '../services/geminiAIService.js';
import { searchDoctorsBySpecialty } from '../utils/doctorClient.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getSmartMatch = async (req, res, next) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return sendError(res, 'Symptoms are required', 400);
    }

    // 1. Get AI Analysis from Gemini
    const aiAnalysis = await analyzeSymptoms(symptoms);

    // 2. Fetch doctors matching the suggested specialty
    // Note: The doctor-service uses 'specialization' as key, 
    // AI returns 'specialty'. We map them here.
    const doctors = await searchDoctorsBySpecialty(aiAnalysis.specialty);

    // 3. Return combined response
    return sendSuccess(res, {
      aiSuggestion: aiAnalysis,
      suggestedDoctors: doctors
    }, 'AI match completed successfully');

  } catch (error) {
    next(error);
  }
};
