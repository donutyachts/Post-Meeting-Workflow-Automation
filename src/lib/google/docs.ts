import { google } from "googleapis";
import type { docs_v1 } from "googleapis";
import { buildGoogleAuthClient } from "./auth";

// The heading text that marks the boundary between Gemini-generated content
// and the raw transcript (Section 3.4).
const TRANSCRIPT_HEADING = "📖 Transcript";

function paragraphToText(paragraph: docs_v1.Schema$Paragraph): string {
  return (paragraph.elements ?? [])
    .map((el) => el.textRun?.content ?? "")
    .join("");
}

/**
 * Fetches a Google Doc and extracts the raw transcript section (Section 3.4).
 *
 * Locates the paragraph containing "📖 Transcript" and returns all document
 * text that follows it. Everything above the heading (Gemini-generated
 * summary, attendee list, etc.) is discarded.
 *
 * Throws "TRANSCRIPT_NOT_FOUND" if the heading is absent — the
 * /api/workflow/generate route handler maps this to a 422 response.
 */
export async function extractTranscript(
  accessToken: string,
  docId: string
): Promise<string> {
  const auth = buildGoogleAuthClient(accessToken);
  const docs = google.docs({ version: "v1", auth });

  const response = await docs.documents.get({ documentId: docId });
  const content = response.data.body?.content ?? [];

  let transcriptFound = false;
  const lines: string[] = [];

  for (const element of content) {
    if (!element.paragraph) continue;

    const text = paragraphToText(element.paragraph);

    if (!transcriptFound) {
      const style = element.paragraph.paragraphStyle?.namedStyleType;
      const isHeading = style === "HEADING_1" || style === "HEADING_2";
      if (isHeading && text.includes(TRANSCRIPT_HEADING)) {
        transcriptFound = true;
      }
      // The heading line itself is not included in the output.
      continue;
    }

    lines.push(text);
  }

  if (!transcriptFound) {
    throw new Error("TRANSCRIPT_NOT_FOUND");
  }

  return lines.join("").trim();
}
