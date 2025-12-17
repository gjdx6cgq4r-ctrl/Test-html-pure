import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `
Tu es un expert en apiculture française et en réglementation sanitaire apicole.
Tu aides un apiculteur à comprendre ses obligations légales (registre d'élevage, cahier de miellerie, déclaration de ruches, médicaments autorisés).
Tes réponses doivent être précises, basées sur la législation française actuelle, et concises.
Si on te pose une question sur un traitement, rappelle l'importance de noter le numéro de lot.
Sois bienveillant et professionnel.
`;

export const askBeekeepingAdvisor = async (question: string): Promise<string> => {
  if (!apiKey) {
    return "Clé API manquante. Veuillez configurer l'application correctement.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "Je n'ai pas pu générer de réponse.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Une erreur est survenue lors de la consultation de l'assistant.";
  }
};
