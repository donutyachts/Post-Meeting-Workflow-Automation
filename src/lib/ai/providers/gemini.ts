import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_API_KEY!);

/**
 * Calls the Gemini API with the pre-built prompt and returns the raw text
 * response. JSON parsing and validation happen in generate.ts.
 *
 * Only generate.ts imports this module — no other part of the codebase
 * may import @google/generative-ai directly (Section 4.6).
 */
export async function generateWithGemini(prompt: string): Promise<string> {
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
