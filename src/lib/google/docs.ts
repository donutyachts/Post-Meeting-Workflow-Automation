import { google } from "googleapis";
import type { docs_v1 } from "googleapis";
import { buildGoogleAuthClient } from "./auth";

function paragraphToText(paragraph: docs_v1.Schema$Paragraph): string {
  return (paragraph.elements ?? [])
    .map((el) => el.textRun?.content ?? "")
    .join("");
}

/**
 * Fetches a Google Doc and extracts the raw transcript from the tab titled
 * "Transcript" (Section 3.4).
 *
 * Uses includeTabsContent: true to retrieve all tabs. Locates the tab whose
 * title is exactly "Transcript", then collects all paragraph text from its
 * body, skipping any HEADING_2 paragraph (the tab's title line).
 *
 * Throws "TRANSCRIPT_NOT_FOUND" if no tab with title "Transcript" exists —
 * the /api/workflow/generate route handler maps this to a 422 response.
 */
export async function extractTranscript(
  accessToken: string,
  docId: string
): Promise<string> {
  const auth = buildGoogleAuthClient(accessToken);
  const docs = google.docs({ version: "v1", auth });

  const response = await docs.documents.get({
    documentId: docId,
    includeTabsContent: true,
  });

  const tabs = response.data.tabs ?? [];
  const transcriptTab = tabs.find(
    (tab) => tab.tabProperties?.title === "Transcript"
  );

  if (!transcriptTab) {
    throw new Error("TRANSCRIPT_NOT_FOUND");
  }

  const content = transcriptTab.documentTab?.body?.content ?? [];
  const lines: string[] = [];

  for (const element of content) {
    if (!element.paragraph) continue;

    const style = element.paragraph.paragraphStyle?.namedStyleType;
    if (style === "HEADING_2") continue;

    lines.push(paragraphToText(element.paragraph));
  }

  return lines.join("").trim();
}
