import { google } from "googleapis";
import { buildGoogleAuthClient } from "./auth";

export type DriveMatch = {
  doc_id: string;
  doc_title: string;
  doc_date: string;        // ISO 8601 date from Drive createdTime
  confidence: "exact" | "partial";
};

const DOCS_MIME_TYPE = "application/vnd.google-apps.document";

// Escape single quotes in Drive query strings.
function escapeForDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Searches Google Drive for Docs whose filename matches the given meeting
 * title (Section 3.2).
 *
 * Tries an exact name match first. If no exact matches are found, falls back
 * to a partial (contains) match. Results are labelled with "exact" or
 * "partial" confidence accordingly.
 *
 * The /api/workflow/match route applies date and duration tiebreakers against
 * these candidates — this function returns raw candidates only.
 */
export async function searchDriveForDoc(
  accessToken: string,
  meetingTitle: string
): Promise<DriveMatch[]> {
  const auth = buildGoogleAuthClient(accessToken);
  const drive = google.drive({ version: "v3", auth });

  const escaped = escapeForDriveQuery(meetingTitle);
  const baseFilter = `mimeType = '${DOCS_MIME_TYPE}' and trashed = false`;

  // Exact match.
  const exactResponse = await drive.files.list({
    q: `name = '${escaped}' and ${baseFilter}`,
    fields: "files(id, name, createdTime)",
    orderBy: "createdTime desc",
    pageSize: 10,
  });

  const exactFiles = exactResponse.data.files ?? [];
  if (exactFiles.length > 0) {
    return exactFiles.map((f) => ({
      doc_id: f.id!,
      doc_title: f.name!,
      doc_date: f.createdTime!.slice(0, 10),
      confidence: "exact" as const,
    }));
  }

  // Partial (contains) match fallback.
  const partialResponse = await drive.files.list({
    q: `name contains '${escaped}' and ${baseFilter}`,
    fields: "files(id, name, createdTime)",
    orderBy: "createdTime desc",
    pageSize: 20,
  });

  return (partialResponse.data.files ?? []).map((f) => ({
    doc_id: f.id!,
    doc_title: f.name!,
    doc_date: f.createdTime!.slice(0, 10),
    confidence: "partial" as const,
  }));
}
