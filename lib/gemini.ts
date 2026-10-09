import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// Returns the model's text, or null if anything goes wrong.
export async function generateText(prompt: string, asJson = false): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: asJson ? { responseMimeType: "application/json" } : undefined,
    });
    const text = response.text?.trim();
    return text || null;
  } catch (err) {
    console.error("Gemini error:", err);
    return null;
  }
}