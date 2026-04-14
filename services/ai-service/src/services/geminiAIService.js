import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

export const analyzeSymptoms = async (symptoms) => {
  // Use user-provided model first, then fallback to others
  const modelsToTry = [config.GEMINI_MODEL, 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
  let lastError = null;

  console.log('Using API Key (first 5 chars):', config.GEMINI_API_KEY ? config.GEMINI_API_KEY.substring(0, 5) : 'MISSING');
  console.log('Preferred Model:', config.GEMINI_MODEL);

  for (const modelName of modelsToTry) {
    if (!modelName) continue;
    
    try {
      console.log(`Attempting analysis with model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY || '');
      
      // The SDK doesn't easily support overriding the BASE_URL directly in the constructor,
      // but the model name is the primary differentiator.
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `
        You are a medical assistant. A patient describes their symptoms as: "${symptoms}"

        Respond in this exact JSON format only, without any markdown formatting or extra text:
        {
          "specialty": "Cardiologist",
          "reason": "One sentence explanation why",
          "urgency": "normal"
        }

        The "specialty" must be exactly one of the following:
        General Physician, Cardiologist, Neurologist, Dermatologist, Orthopedic, Pediatrician, Gynecologist, Psychiatrist, ENT Specialist

        Guidelines:
        1. If symptoms suggest a life-threatening emergency (e.g., heart attack signs, stroke signs, severe bleeding, difficulty breathing), set "urgency" to "emergency" and "specialty" to "General Physician".
        2. If symptoms are urgent but not life-threatening, set "urgency" to "urgent".
        3. Otherwise, set "urgency" to "normal".
        4. If the symptoms are unclear, default to "General Physician" with "urgency" as "normal".
        5. The "reason" should be a concise, professional explanation for the suggestion.

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
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error.message);
      lastError = error;
      // Continue to next model
      continue;
    }
  }

  console.error('All Gemini models failed. Last Error:', lastError);
  // Fallback response
  return {
    specialty: 'General Physician',
    reason: 'Based on the input provided, we recommend seeing a general physician for an initial assessment.',
    urgency: 'normal'
  };
};
