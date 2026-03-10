import { describe, it, expect } from "vitest";
import { Client as NotionClient } from "@notionhq/client";
import { appendRecordToNotion } from "@/lib/notion/client";
import type { StructuredDataRecord } from "@/types/structured-data";
import { testEnv } from "./helpers/env";

/**
 * Integration tests: Notion writing
 *
 * Writes four records covering all field combinations to the test Notion database,
 * then reads them back via the Notion API to verify correctness.
 */

describe("Notion writing", () => {
  it("appends records with all field combinations and values match input exactly", async () => {
    const databaseId = testEnv.notionDatabaseId();
    const meetingTitle = testEnv.meetingTitle();
    const meetingDate = testEnv.meetingDate();

    // Four records covering all combinations of owner/due_date presence
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

    // Write all four records
    for (const record of records) {
      await appendRecordToNotion(databaseId, record);
    }

    // Read back the last 4 pages from the database, sorted by created_time desc
    const notion = new NotionClient({ auth: testEnv.notionApiKey() });

    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 4,
    });

    expect(response.results).toHaveLength(4);

    // Results are newest-first; reverse to match insertion order
    const pages = [...response.results].reverse();

    for (let i = 0; i < records.length; i++) {
      const page = pages[i];
      const expected = records[i];

      if (!("properties" in page)) {
        throw new Error(`Expected a full page object at index ${i}`);
      }

      const props = page.properties;

      // --- Name (Title) → description ---
      // appendRecordToNotion writes description to the Title property "Name".
      const nameProp = props["Name"];
      if (nameProp?.type === "title") {
        const text = nameProp.title.map((t: { plain_text: string }) => t.plain_text).join("");
        expect(text).toBe(expected.description);
      } else {
        throw new Error(`Expected Name to be title type at index ${i}`);
      }

      // --- Category (Select) → category ---
      const catProp = props["Category"];
      if (catProp?.type === "select") {
        expect(catProp.select?.name).toBe(expected.category);
      } else {
        throw new Error(`Expected Category to be select type at index ${i}`);
      }

      // --- Owner (Rich Text) → owner ---
      // Omitted from pages.create when null; Notion returns the property with
      // an empty rich_text array in that case.
      const ownerProp = props["Owner"];
      if (ownerProp?.type === "rich_text") {
        const text = ownerProp.rich_text.map((t: { plain_text: string }) => t.plain_text).join("");
        expect(text).toBe(expected.owner ?? "");
      } else if (expected.owner !== null) {
        throw new Error(`Expected Owner to be rich_text type at index ${i}`);
      }

      // --- Due Date (Date) → due_date ---
      // Omitted from pages.create when null; Notion returns the property with
      // date: null in that case.
      const dueDateProp = props["Due Date"];
      if (dueDateProp?.type === "date") {
        if (expected.due_date !== null) {
          expect(dueDateProp.date?.start).toBe(expected.due_date);
        } else {
          expect(dueDateProp.date).toBeNull();
        }
      } else {
        throw new Error(`Expected "Due Date" to be date type at index ${i}`);
      }

      // --- Meeting (Rich Text) → meeting_title ---
      const meetingProp = props["Meeting"];
      if (meetingProp?.type === "rich_text") {
        const text = meetingProp.rich_text.map((t: { plain_text: string }) => t.plain_text).join("");
        expect(text).toBe(expected.meeting_title);
      } else {
        throw new Error(`Expected Meeting to be rich_text type at index ${i}`);
      }

      // --- Meeting Date (Date) → meeting_date ---
      const meetingDateProp = props["Meeting Date"];
      if (meetingDateProp?.type === "date") {
        expect(meetingDateProp.date?.start).toBe(expected.meeting_date);
      } else {
        throw new Error(`Expected "Meeting Date" to be date type at index ${i}`);
      }
    }
  });
});
