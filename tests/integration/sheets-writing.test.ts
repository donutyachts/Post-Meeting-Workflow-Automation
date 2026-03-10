import { describe, it, expect } from "vitest";
import { google } from "googleapis";
import { appendRecordsToSheet } from "@/lib/google/sheets";
import { buildGoogleAuthClient } from "@/lib/google/auth";
import type { StructuredDataRecord } from "@/types/structured-data";
import { testEnv } from "./helpers/env";

/**
 * Integration tests: Google Sheets writing
 *
 * Writes the same four records used in the Notion test to the test Google Sheet,
 * then reads them back to verify column order and field values.
 *
 * Expected column order: Category | Description | Owner | Due Date | Meeting | Meeting Date
 */

describe("Google Sheets writing", () => {
  it("appends records and column order matches schema", async () => {
    const accessToken = testEnv.googleAccessToken();
    const spreadsheetId = testEnv.googleSheetsSpreadsheetId();
    const meetingTitle = testEnv.meetingTitle();
    const meetingDate = testEnv.meetingDate();

    // Same four records as the Notion test — all field combinations
    const records: StructuredDataRecord[] = [
      {
        category: "Action items",
        description: "Test record 1 — owner present, due_date present",
        owner: "Alice",
        due_date: "2026-04-01",
        meeting_title: meetingTitle,
        meeting_date: meetingDate,
      },
      {
        category: "Decisions",
        description: "Test record 2 — owner present, due_date null",
        owner: "Bob",
        due_date: null,
        meeting_title: meetingTitle,
        meeting_date: meetingDate,
      },
      {
        category: "Risks",
        description: "Test record 3 — owner null, due_date present",
        owner: null,
        due_date: "2026-04-15",
        meeting_title: meetingTitle,
        meeting_date: meetingDate,
      },
      {
        category: "Things to know",
        description: "Test record 4 — owner null, due_date null",
        owner: null,
        due_date: null,
        meeting_title: meetingTitle,
        meeting_date: meetingDate,
      },
    ];

    // Append the records
    await appendRecordsToSheet(accessToken, spreadsheetId, records);

    // Read back using the Sheets API to verify appended rows
    const authClient = buildGoogleAuthClient(accessToken);
    const sheets = google.sheets({ version: "v4", auth: authClient });

    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A:F",
    });

    const allRows = readResponse.data.values ?? [];
    expect(allRows.length).toBeGreaterThanOrEqual(4);

    // Take the last 4 rows (the ones we just wrote)
    const writtenRows = allRows.slice(allRows.length - 4);

    expect(writtenRows).toHaveLength(4);

    // Expected column order: Category | Description | Owner | Due Date | Meeting | Meeting Date
    const COLUMN = {
      CATEGORY: 0,
      DESCRIPTION: 1,
      OWNER: 2,
      DUE_DATE: 3,
      MEETING: 4,
      MEETING_DATE: 5,
    };

    for (let i = 0; i < records.length; i++) {
      const row = writtenRows[i];
      const expected = records[i];

      expect(row[COLUMN.CATEGORY]).toBe(expected.category);
      expect(row[COLUMN.DESCRIPTION]).toBe(expected.description);
      expect(row[COLUMN.OWNER]).toBe(expected.owner ?? "");
      expect(row[COLUMN.DUE_DATE]).toBe(expected.due_date ?? "");
      expect(row[COLUMN.MEETING]).toBe(expected.meeting_title);
      expect(row[COLUMN.MEETING_DATE]).toBe(expected.meeting_date);
    }
  });
});
