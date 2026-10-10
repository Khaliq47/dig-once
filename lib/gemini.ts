import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL; // optional

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(err: unknown) {
  const status = (err as { status?: number })?.status;
  return status === 503 || status === 429 || status === 500;
}

// Tries a model twice (one retry after a short wait if Google is overloaded).
async function tryModel(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  asJson: boolean
): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: asJson ? { responseMimeType: "application/json" } : undefined,
      });
      const text = response.text?.trim();
      return text || null;
    } catch (err) {
      console.error(`Gemini error (${model}, attempt ${attempt}):`, err);
      if (!isRetryable(err) || attempt === 2) return null;
      await sleep(1500);
    }
  }
  return null;
}

// Returns the model's text, or null if everything fails.
export async function generateText(prompt: string, asJson = false): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const first = await tryModel(ai, MODEL, prompt, asJson);
  if (first) return first;

  if (FALLBACK_MODEL && FALLBACK_MODEL !== MODEL) {
    return tryModel(ai, FALLBACK_MODEL, prompt, asJson);
  }
  return null;
}