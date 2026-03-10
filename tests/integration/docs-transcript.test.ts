import { describe, it, expect } from "vitest";
import { extractTranscript } from "@/lib/google/docs";
import { testEnv } from "./helpers/env";

/**
 * Integration tests: Google Docs transcript extraction
 *
 * These tests use real Docs API calls. The fixture Docs must be set up in the
 * test Google account before running these tests.
 */
describe("Docs transcript extraction", () => {
  it("extracts only content below the '# 📖 Transcript' heading", async () => {
    const accessToken = testEnv.googleAccessToken();
    const docId = testEnv.docIdWithTranscript();

    const transcript = await extractTranscript(accessToken, docId);

    // Must return a non-empty string
    expect(typeof transcript).toBe("string");
    expect(transcript.trim().length).toBeGreaterThan(0);

    // The Gemini summary section (above the transcript heading) contains the
    // information_desk_person emoji in its header. That content must not appear
    // in the extracted transcript — only content below the heading is returned.
    expect(transcript).not.toContain(":information_desk_person:");
  });

  it("throws TRANSCRIPT_NOT_FOUND when the heading is absent", async () => {
    const accessToken = testEnv.googleAccessToken();
    const docId = testEnv.docIdNoTranscript();

    await expect(extractTranscript(accessToken, docId)).rejects.toThrow(
      "TRANSCRIPT_NOT_FOUND"
    );
  });
});
