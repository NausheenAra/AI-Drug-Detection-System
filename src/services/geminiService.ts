import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
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

  const systemInstruction = `You are a world-class clinical pharmacist and drug interaction specialist. 
  Perform a comprehensive clinical analysis of potential drug-to-drug interactions.
  
  CRITICAL VALIDATION: Before performing the analysis, verify if each input provided is a valid medication (generic name, brand name, or common pharmaceutical compound). 
  If any input is NOT a valid medication (e.g., random text, food items not known for drug interactions, non-medical substances), list them in the "invalidDrugs" array.
  If there are invalid drugs, you should still attempt to analyze the valid ones if at least two valid drugs remain, but if fewer than two valid drugs remain, set severity to "None" and description to "Please enter valid drug inputs for analysis."
  
  CRITICAL: You MUST analyze EVERY unique pair of the provided medications. 
  IMPORTANT: Use the EXACT medication names as provided in the list. Do not shorten or modify them in the "drugA" and "drugB" fields of the "interactions" array.
  
  For example, if drugs A, B, and C are provided, you must evaluate the unique interactions for: (A,B), (A,C), and (B,C). You do not need to repeat pairs in reverse order (e.g., no need for B,A if A,B is analyzed).
  
  PRIORITY: Identify and highlight interactions with the highest potential for severe clinical outcomes (e.g., life-threatening events, permanent disability, hospitalization).
  
  The analysis must include:
  1. Overall Severity: Categorize the highest risk as "High", "Medium", or "Low" (or "None" if no interactions).
  2. Clinical Description: A professional summary of the pharmacological mechanisms and clinical significance.
  3. Interaction Pairs: For EVERY unique pair, specify (drugA, drugB, severity, description, recommendation). The "description" MUST be a clear medical explanation of the interaction, including pharmacological mechanisms if applicable. If no interaction exists for a pair, set severity to "None" and provide a brief clinical confirmation that no significant interaction is expected.
  4. Side Effects: Common and rare adverse effects arising from the combination.
  5. Medical Risks: Specific physiological risks (e.g., QT prolongation, serotonin syndrome, bleeding risk).
  6. Safer Alternatives: Suggest alternative medications that avoid high-risk interactions.
  7. Patient Population Contraindications: Explicitly identify risks for:
     - Elderly (e.g., Beers Criteria, fall risk)
     - Pregnant/Lactating (e.g., teratogenicity)
     - Renally Impaired (e.g., dosage adjustments, nephrotoxicity)
  8. Critical Alerts: Urgent warnings for both patients and healthcare providers.
  9. Invalid Drugs: List any inputs that are not recognized as valid medications.

  This analysis should be based on global clinical standards and apply to all medications available worldwide.
  Return the response in structured JSON format.`;

  const userPrompt = `Analyze these medications: ${drugs.join(", ")}. 
  Please provide interaction details for the following unique pairs: ${drugs.flatMap((d1, i) => drugs.slice(i + 1).map(d2 => `(${d1}, ${d2})`)).join(", ")}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: userPrompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
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
            },
            invalidDrugs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of inputs that are not recognized as valid medications."
            }
          },
          required: ["severity", "description", "interactions", "sideEffects", "problems", "alternatives", "alerts", "patientContraindications", "invalidDrugs"]
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
