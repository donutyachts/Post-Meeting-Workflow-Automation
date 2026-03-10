import { RECORD_CATEGORIES, type RecordCategory } from "@/types/structured-data";
import { generateWithAnthropic } from "./providers/anthropic";
import { generateWithGemini } from "./providers/gemini";

// AI record shape as returned by the model. Does not include meeting_title or
// meeting_date — those are added by the /api/workflow/generate route handler
// when enriching records before returning them to the client.
export type AiRecord = {
  category: RecordCategory;
  description: string;
  owner: string | null;
  due_date: string | null;
};

export type GenerateResult = {
  summary: string;
  records: AiRecord[];
};

// Prompt defined verbatim per Section 3.5.1. Shared across both providers
// without modification — only {{MEETING_TITLE}} and {{TRANSCRIPT}} are
// substituted at runtime.
const PROMPT_TEMPLATE = `You are an expert meeting notes assistant. Your job is to read a raw meeting transcript and produce two outputs: a formatted meeting summary and a list of structured data records.

---

MEETING TITLE: {{MEETING_TITLE}}

TRANSCRIPT:
{{TRANSCRIPT}}

---

INSTRUCTIONS

Read the transcript carefully. Ignore filler words, crosstalk, and off-topic conversation. Focus on what was concluded, decided, agreed upon, assigned, or flagged.

Produce your response as a single JSON object with two keys: "summary" and "records". Do not include any text outside the JSON object.

---

SUMMARY FORMAT

The summary must follow this exact format:

:information_desk_person: Brief notes from today's \`{{MEETING_TITLE}}\` meeting
*[Section Label]*
• [Bullet]
• [Bullet]
*[Section Label]*
• [Bullet]

Rules:
- Section labels must be bold using asterisks, e.g. *Action items*
- Section labels must come only from this list: Conclusions, Action items, Changes, Decisions, Things to know, Risks, Problems
- Only include sections that have content from the transcript — omit empty sections entirely
- Bullets must be single-sentence, concise, and declarative
- Tone is neutral and factual
- Do not include an attendee list, date, time, or closing line
- Do not include timestamps or speaker names
- Do not include the Gemini-generated summary or any content that precedes the raw transcript

---

RECORDS FORMAT

For each bullet in the summary, produce a corresponding structured data record.

Each record must be a JSON object with these fields:
- "category": one of — Conclusions, Action items, Changes, Decisions, Things to know, Risks, Problems
- "description": the bullet text, single sentence, declarative
- "owner": the full name of the person responsible, inferred from the transcript — or null if not identifiable
- "due_date": a date in ISO 8601 format (YYYY-MM-DD) if a deadline is stated or clearly implied in the transcript — or null if not present

---

RESPONSE SHAPE

Respond with only this JSON structure and nothing else:

{
  "summary": "...",
  "records": [
    {
      "category": "Action items",
      "description": "Eric to send Amy examples of the ecom provisioning issue to check if the script is wrong.",
      "owner": "Eric Arseneault",
      "due_date": null
    }
  ]
}`;

function buildPrompt(meetingTitle: string, transcript: string): string {
  return PROMPT_TEMPLATE.replaceAll("{{MEETING_TITLE}}", meetingTitle).replaceAll(
    "{{TRANSCRIPT}}",
    transcript
  );
}

// Some models wrap their JSON response in markdown code fences despite
// being instructed not to. Strip them before parsing.
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : raw.trim();
}

function parseAndValidate(raw: string): GenerateResult {
  const json = extractJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(
      `AI response is not valid JSON. First 200 chars: ${json.slice(0, 200)}`
    );
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.summary !== "string") {
    throw new Error('AI response missing required "summary" string field.');
  }
  if (!Array.isArray(obj.records)) {
    throw new Error('AI response missing required "records" array field.');
  }

  for (let i = 0; i < obj.records.length; i++) {
    const record = obj.records[i] as Record<string, unknown>;
    if (!RECORD_CATEGORIES.includes(record.category as RecordCategory)) {
      throw new Error(
        `AI response record[${i}] has invalid category: "${record.category}". ` +
          `Expected one of: ${RECORD_CATEGORIES.join(", ")}.`
      );
    }
  }

  return { summary: obj.summary, records: obj.records as AiRecord[] };
}

/**
 * Generates a structured meeting summary and extracted data records from a
 * raw transcript.
 *
 * Routes to Anthropic Claude or Google Gemini based on the AI_PROVIDER
 * environment variable. This is the only function in the codebase that may
 * be called for AI generation — no other module imports either provider SDK
 * directly (Section 4.6, Section 7 — AI Provider Abstraction).
 */
export async function generateSummary(
  transcript: string,
  meetingTitle: string
): Promise<GenerateResult> {
  const prompt = buildPrompt(meetingTitle, transcript);
  const provider = process.env.AI_PROVIDER;

  let raw: string;
  if (provider === "anthropic") {
    raw = await generateWithAnthropic(prompt);
  } else if (provider === "gemini") {
    raw = await generateWithGemini(prompt);
  } else {
    throw new Error(
      `Unknown AI_PROVIDER: "${provider}". Must be "anthropic" or "gemini".`
    );
  }

  return parseAndValidate(raw);
}
