import { describe, it, expect } from "vitest";
import { searchDriveForDoc } from "@/lib/google/drive";
import { testEnv } from "./helpers/env";

/**
 * Integration tests: Google Calendar → Drive matching
 *
 * These tests use real Drive API calls against the test Google account.
 * They do NOT call getLatestOrganizerEvent — the event title is provided
 * via TEST_CALENDAR_EVENT_TITLE so tests are deterministic and fast.
 */
describe("Calendar → Drive matching", () => {
  it("returns exact match when a Gemini Notes Doc title matches the event title", async () => {
    const accessToken = testEnv.googleAccessToken();
    const title = testEnv.calendarEventTitle();

    const matches = await searchDriveForDoc(accessToken, title);

    expect(matches.length).toBeGreaterThan(0);

    // The best match must be confidence "exact"
    const exactMatches = matches.filter((m) => m.confidence === "exact");
    expect(exactMatches.length).toBeGreaterThan(0);

    const best = exactMatches[0];
    expect(best.doc_id).toBeTruthy();
    expect(best.doc_title).toBeTruthy();
    expect(best.doc_date).toBeTruthy();
  });

  it("returns multiple candidates when several Drive Docs match the title (ambiguous)", async () => {
    const accessToken = testEnv.googleAccessToken();
    const title = testEnv.calendarAmbiguousTitle();

    const matches = await searchDriveForDoc(accessToken, title);

    // Ambiguous: tiebreaker logic has not resolved to a single result
    expect(matches.length).toBeGreaterThan(1);

    // All returned entries should have required fields
    for (const match of matches) {
      expect(match.doc_id).toBeTruthy();
      expect(match.doc_title).toBeTruthy();
      expect(["exact", "partial"]).toContain(match.confidence);
    }
  });

  it("returns empty array (no error) when no Drive Doc matches the event title", async () => {
    const accessToken = testEnv.googleAccessToken();
    const title = testEnv.calendarNoMatchTitle();

    // Must not throw — callers handle the empty-array case gracefully
    const matches = await searchDriveForDoc(accessToken, title);

    expect(Array.isArray(matches)).toBe(true);
    expect(matches).toHaveLength(0);
  });
});
