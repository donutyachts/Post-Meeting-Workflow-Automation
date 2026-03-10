import { describe, it, expect, vi } from "vitest";
import { postToSlack } from "@/lib/slack/client";
import type { StructuredDataRecord } from "@/types/structured-data";
import { testEnv } from "./helpers/env";

/**
 * Integration tests: Partial approval failure
 *
 * These two sub-tests demonstrate that Slack and Notion writes are independent:
 * one can succeed while the other fails.
 *
 * The approve route's 207 partial-success response (combining Slack success +
 * Notion failure) is exercised at the route level by
 * approve-route-partial-failure.test.ts.
 */

const SAMPLE_SUMMARY =
  ":information_desk_person: Brief notes from today's test meeting.\n\nThis is a partial-failure integration test message.";

const SAMPLE_RECORD: StructuredDataRecord = {
  category: "Action items",
  description: "Partial failure test record",
  owner: "Tester",
  due_date: null,
  meeting_title: "Partial Failure Test Meeting",
  meeting_date: "2026-03-10",
};

describe("Partial approval failure — independent subsystem behaviour", () => {
  it("Slack post succeeds with valid credentials", async () => {
    const channelId = testEnv.slackChannelId();

    // Should resolve without error when the bot token is valid
    await expect(postToSlack(channelId, SAMPLE_SUMMARY)).resolves.not.toThrow();
  });

  it("Notion write fails with an invalid API key", async () => {
    // Stub the env var before the module is loaded so the Notion client picks
    // up the invalid key. vi.resetModules() is required because the Notion
    // client reads NOTION_API_KEY at module load time.
    vi.stubEnv("NOTION_API_KEY", "invalid_key_for_test");
    vi.resetModules();

    try {
      const { appendRecordToNotion } = await import("@/lib/notion/client");
      const databaseId = testEnv.notionDatabaseId();

      await expect(
        appendRecordToNotion(databaseId, SAMPLE_RECORD)
      ).rejects.toThrow();
    } finally {
      // Always restore the original env so subsequent tests are not affected
      vi.unstubAllEnvs();
      // Re-reset modules so the real Notion client is loaded next time
      vi.resetModules();
    }
  });
});
