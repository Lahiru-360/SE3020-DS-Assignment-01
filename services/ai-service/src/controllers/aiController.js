import { analyzeSymptoms } from '../services/geminiAIService.js';
import { searchDoctorsBySpecialty } from '../utils/doctorClient.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getSmartMatch = async (req, res, next) => {
  try {
    const { symptoms } = req.body;

    // 1. Get AI Analysis from Gemini
    const aiAnalysis = await analyzeSymptoms(symptoms);

    // 2. Fetch doctors matching the suggested specialty
    // Fault Tolerant Design: If doctor lookup fails, we still return the AI advice.
    let doctors = [];
    let lookupStatus = 'success';

    try {
      doctors = await searchDoctorsBySpecialty(aiAnalysis.specialty);
    } catch (doctorError) {
      console.log(`[AI-Service] Doctor lookup failed or timed out: ${doctorError.message}`);
      lookupStatus = 'unavailable';
    }

    // 3. Return combined response
    return sendSuccess(res, {
      aiSuggestion: aiAnalysis,
      suggestedDoctors: doctors,
      metadata: {
        doctorLookup: lookupStatus
      }
    }, 'AI match completed successfully');

  } catch (error) {
    console.log(`[AI-Service] Analysis Error: ${error.message}`);
    next(error);
  }
};
