import { GoogleGenAI, Type } from "@google/genai";
import { InteractionResult, Severity } from "../types";

// The API key is injected by the platform into process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeInteractions(drugs: string[]): Promise<InteractionResult> {
  if (drugs.length < 2) {
    return {
      severity: Severity.NONE,
      description: "Please enter at least two medications to analyze potential interactions.",
      interactions: [],
      sideEffects: [],
      problems: [],
      alternatives: [],
      alerts: []
    };
  }

  const prompt = `Perform a comprehensive clinical analysis of potential drug-to-drug interactions between these medications: ${drugs.join(", ")}. 
  
  PRIORITY: Identify and highlight interactions with the highest potential for severe clinical outcomes (e.g., life-threatening events, permanent disability, hospitalization).
  
  The analysis must include:
  1. Overall Severity: Categorize the highest risk as "High", "Medium", or "Low" (or "None" if no interactions).
  2. Clinical Description: A professional summary of the pharmacological mechanisms and clinical significance.
  3. Interaction Pairs: For each pair, specify (drugA, drugB, severity, description, recommendation).
  4. Side Effects: Common and rare adverse effects arising from the combination.
  5. Medical Risks: Specific physiological risks (e.g., QT prolongation, serotonin syndrome, bleeding risk).
  6. Safer Alternatives: Suggest alternative medications that avoid high-risk interactions.
  7. Patient Population Contraindications: Explicitly identify risks for:
     - Elderly (e.g., Beers Criteria, fall risk)
     - Pregnant/Lactating (e.g., teratogenicity)
     - Renally Impaired (e.g., dosage adjustments, nephrotoxicity)
  8. Critical Alerts: Urgent warnings for both patients and healthcare providers.

  This analysis should be based on global clinical standards and apply to all medications available worldwide.
  Return the response in structured JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: {
              type: Type.STRING,
              enum: ["High", "Medium", "Low", "None"],
              description: "The highest severity level found among all interactions."
            },
            description: {
              type: Type.STRING,
              description: "A comprehensive summary of the interactions."
            },
            interactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drugA: { type: Type.STRING },
                  drugB: { type: Type.STRING },
                  severity: { 
                    type: Type.STRING,
                    enum: ["High", "Medium", "Low", "None"]
                  },
                  description: { type: Type.STRING },
                  recommendation: { type: Type.STRING }
                },
                required: ["drugA", "drugB", "severity", "description"]
              },
              description: "List of specific drug-drug interaction pairs."
            },
            sideEffects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of potential side effects from the combination."
            },
            problems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Specific medical risks or contraindications."
            },
            alternatives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Suggested safer alternatives if applicable."
            },
            patientContraindications: {
              type: Type.OBJECT,
              properties: {
                elderly: { type: Type.ARRAY, items: { type: Type.STRING } },
                pregnant: { type: Type.ARRAY, items: { type: Type.STRING } },
                renallyImpaired: { type: Type.ARRAY, items: { type: Type.STRING } },
                other: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["elderly", "pregnant", "renallyImpaired"]
            },
            alerts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Critical warnings that require immediate attention."
            }
          },
          required: ["severity", "description", "interactions", "sideEffects", "problems", "alternatives", "alerts", "patientContraindications"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as InteractionResult;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw new Error("The AI analysis service is currently unavailable. Please try again later.");
  }
}
