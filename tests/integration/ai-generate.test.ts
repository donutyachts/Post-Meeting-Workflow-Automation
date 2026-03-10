import { describe, it, expect, vi, beforeAll } from "vitest";
import { extractTranscript } from "@/lib/google/docs";
import { generateSummary } from "@/lib/ai/generate";
import { RECORD_CATEGORIES } from "@/types/structured-data";
import { testEnv } from "./helpers/env";

/**
 * Integration tests: AI provider — summary generation
 *
 * Per spec section 8.4: AI output consistency cannot be asserted.
 * These tests validate STRUCTURE and TAXONOMY COMPLIANCE only — not exact content.
 *
 * Both providers are tested independently to validate provider parity.
 * Real API keys are required; mocking is explicitly disallowed by the spec.
 */

let sharedTranscript: string;

beforeAll(async () => {
  // Extract the transcript once and share it across all provider sub-tests.
  // This avoids redundant Docs API calls and keeps test runtime reasonable.
  const accessToken = testEnv.googleAccessToken();
  const docId = testEnv.docIdWithTranscript();
  sharedTranscript = await extractTranscript(accessToken, docId);
});

describe.each([["anthropic"], ["gemini"]])(
  "generateSummary with provider: %s",
  (provider) => {
    it(`returns a valid summary and records (provider: ${provider})`, async () => {
      const meetingTitle = testEnv.meetingTitle();

      // Stub AI_PROVIDER before calling generateSummary.
      // generate.ts reads process.env.AI_PROVIDER inside the function body (not
      // at module load), so vi.stubEnv is sufficient to switch providers without
      // needing vi.resetModules(). The provider SDK clients (Anthropic, Gemini)
      // are module-level singletons initialized with their own API keys, which
      // are both valid in the test environment and do not change between tests.
      vi.stubEnv("AI_PROVIDER", provider);

      let result: Awaited<ReturnType<typeof generateSummary>>;
      try {
        result = await generateSummary(sharedTranscript, meetingTitle);
      } finally {
        vi.unstubAllEnvs();
      }

      // --- Structure assertions ---

      // Summary must be a non-empty string
      expect(typeof result.summary).toBe("string");
      expect(result.summary.trim().length).toBeGreaterThan(0);

      // Summary must begin with the expected Slack emoji prefix
      expect(result.summary).toMatch(
        /^:information_desk_person: Brief notes from today's/
      );

      // Records must be a non-empty array
      expect(Array.isArray(result.records)).toBe(true);
      expect(result.records.length).toBeGreaterThan(0);

      // --- Taxonomy compliance ---
      for (const record of result.records) {
        expect(RECORD_CATEGORIES).toContain(record.category);
        expect(typeof record.description).toBe("string");
        expect(record.description.trim().length).toBeGreaterThan(0);
      }
    });
  }
);
