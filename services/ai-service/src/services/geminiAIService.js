import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

export const analyzeSymptoms = async (symptoms) => {
  // Use user-provided model first, then fallback to others
  const modelsToTry = [config.GEMINI_MODEL, 'gemini-2.0-flash', 'gemini-2.0-pro-exp-02-05'];
  let lastError = null;

  console.log('Using API Key (first 5 chars):', config.GEMINI_API_KEY ? config.GEMINI_API_KEY.substring(0, 5) : 'MISSING');

  for (const modelName of modelsToTry) {
    if (!modelName) continue;
    
    try {
      console.log(`Attempting analysis with model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `
        You are a medical assistant. A patient describes their symptoms as: "${symptoms}"

        Respond in this exact JSON format only, without any markdown formatting or extra text:
        {
          "specialty": "Cardiologist",
          "reason": "One sentence explanation why",
          "urgency": "normal",
          "warning": null
        }

        The "specialty" must be exactly one of the following:
        General Physician, Cardiologist, Neurologist, Dermatologist, Orthopedic, Pediatrician, Gynecologist, Psychiatrist, ENT Specialist

        Guidelines:
        1. If symptoms suggest a life-threatening emergency (e.g., heart attack signs, stroke signs, severe bleeding, difficulty breathing), set "urgency" to "emergency" and "specialty" to "General Physician".
        2. In emergency cases, set "warning" to "IMMEDIATE ACTION REQUIRED: Please proceed to the nearest Emergency Room or call emergency services (e.g., 911/199) immediately."
        3. If symptoms are urgent but not life-threatening, set "urgency" to "urgent" and "warning" to null.
        4. Otherwise, set "urgency" to "normal" and "warning" to null.
        5. If the symptoms are unclear, default to "General Physician" with "urgency" as "normal".
        6. The "reason" should be a concise, professional explanation for the suggestion.

        Response (JSON only):
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`Gemini Raw Response (${modelName}):`, text);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);

      // Safety check: force standardized warning if Gemini missed it but flagged emergency
      if (parsed.urgency === 'emergency' && !parsed.warning) {
        parsed.warning = "IMMEDIATE ACTION REQUIRED: Please proceed to the nearest Emergency Room or call emergency services immediately.";
      }

      return parsed;
    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error.message);
      lastError = error;
      continue;
    }
  }

  console.error('All Gemini models failed. Last Error:', lastError);
  // Fallback response
  return {
    specialty: 'General Physician',
    reason: 'Based on the input provided, we recommend seeing a general physician for an initial assessment.',
    urgency: 'normal',
    warning: null
  };
};
