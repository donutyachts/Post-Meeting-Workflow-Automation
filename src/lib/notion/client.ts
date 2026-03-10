import { Client } from "@notionhq/client";
import type { StructuredDataRecord } from "@/types/structured-data";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

/**
 * Creates a new page in a Notion database for a single structured data record.
 *
 * Property mapping per Section 5.7:
 *   Name (Title)       → description
 *   Category (Select)  → category
 *   Owner (Text)       → owner (omitted when null)
 *   Due Date (Date)    → due_date (omitted when null)
 *   Meeting (Text)     → meeting_title
 *   Meeting Date (Date)→ meeting_date
 */
export async function appendRecordToNotion(
  databaseId: string,
  record: StructuredDataRecord
): Promise<void> {
  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Name: {
        title: [{ text: { content: record.description } }],
      },
      Category: {
        select: { name: record.category },
      },
      ...(record.owner
        ? { Owner: { rich_text: [{ text: { content: record.owner } }] } }
        : {}),
      ...(record.due_date
        ? { "Due Date": { date: { start: record.due_date } } }
        : {}),
      Meeting: {
        rich_text: [{ text: { content: record.meeting_title } }],
      },
      "Meeting Date": {
        date: { start: record.meeting_date },
      },
    },
  });
}
