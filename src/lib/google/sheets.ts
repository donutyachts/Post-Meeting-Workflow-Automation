import { google } from "googleapis";
import type { StructuredDataRecord } from "@/types/structured-data";
import { buildGoogleAuthClient } from "./auth";

/**
 * Appends structured data records to a Google Sheet (Section 3.8).
 *
 * Columns are written in the order required by Section 5.8:
 *   Category | Description | Owner | Due Date | Meeting | Meeting Date
 *
 * Null owner and due_date values are written as empty strings.
 * Values are appended after the last row with data in columns A–F.
 */
export async function appendRecordsToSheet(
  accessToken: string,
  spreadsheetId: string,
  records: StructuredDataRecord[]
): Promise<void> {
  const auth = buildGoogleAuthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const rows = records.map((r) => [
    r.category,
    r.description,
    r.owner ?? "",
    r.due_date ?? "",
    r.meeting_title,
    r.meeting_date,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A:F",
    // RAW preserves ISO date strings as plain text, matching the string types
    // in StructuredDataRecord. USER_ENTERED would reformat them as Sheets dates.
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}
