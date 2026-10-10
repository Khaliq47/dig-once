// Gemini vision: classify a report photo. Server-side only.
// Core rule: this must NEVER throw into the caller. Any failure => "unclassified".

export type AiResult =
  | { ai_status: "classified"; ai_category: "road_cut" | "drain" | "pipeline" | "other"; ai_confidence: number }
  | { ai_status: "unclassified"; ai_category: null; ai_confidence: null };

const UNCLASSIFIED: AiResult = { ai_status: "unclassified", ai_category: null, ai_confidence: null };
const CATEGORIES = ["road_cut", "drain", "pipeline", "other"] as const;
const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 8000;

const PROMPT = `You are classifying a photo submitted by a resident about public works in an Indian city.
Choose the single best category for the work visible in the photo:
- road_cut: a trench or excavation dug into a road or pavement, or a resurfacing job
- drain: stormwater or sewer drain construction or repair
- pipeline: water, gas or cable pipes being laid or repaired
- other: anything else, or the photo does not show public works
Respond with JSON only: {"category": "<one of the four>", "confidence": <number between 0 and 1>}`;

export async function classifyPhoto(bytes: ArrayBuffer, mimeType: string): Promise<AiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || bytes.byteLength > MAX_BYTES || !mimeType.startsWith("image/")) return UNCLASSIFIED;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: Buffer.from(bytes).toString("base64") } },
            ],
          }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
      }
    );
    if (!res.ok) return UNCLASSIFIED;
    const json = await res.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return UNCLASSIFIED;
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const category = parsed?.category;
    const confidence = Number(parsed?.confidence);
    if (!CATEGORIES.includes(category) || Number.isNaN(confidence)) return UNCLASSIFIED;
    return {
      ai_status: "classified",
      ai_category: category,
      ai_confidence: Math.min(1, Math.max(0, confidence)),
    };
  } catch {
    return UNCLASSIFIED; // timeout, network error, bad JSON, quota - carry on
  } finally {
    clearTimeout(timer);
  }
}
