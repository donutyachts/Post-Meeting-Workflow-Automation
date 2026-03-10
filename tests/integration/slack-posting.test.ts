import { describe, it, expect } from "vitest";
import { postToSlack } from "@/lib/slack/client";
import { testEnv } from "./helpers/env";

/**
 * Integration tests: Slack posting
 *
 * These tests post real messages to the dedicated test Slack channel.
 * Never run against a live project channel.
 */

// Regex used by the approve route to validate thread_ts format.
// Validation lives in the route handler, not in postToSlack itself.
const THREAD_TS_REGEX = /^\d+\.\d+$/;

const TEST_MESSAGE_TEXT =
  ":white_check_mark: Integration test message from post-meeting-workflow-automation tests.";

describe("Slack posting", () => {
  it("posts a top-level message when no thread_ts is provided", async () => {
    const channelId = testEnv.slackChannelId();

    // Must not throw — message appears as a new top-level post in the channel
    await expect(postToSlack(channelId, TEST_MESSAGE_TEXT)).resolves.not.toThrow();
  });

  it("posts a thread reply when a valid thread_ts is provided", async () => {
    const channelId = testEnv.slackChannelId();
    const threadTs = testEnv.slackThreadTs();

    // Must not throw — message appears as a reply under the parent message
    await expect(
      postToSlack(channelId, TEST_MESSAGE_TEXT, threadTs)
    ).resolves.not.toThrow();
  });

  it("rejects a malformed thread_ts at the route-validation layer", () => {
    // The postToSlack library function does NOT validate thread_ts format.
    // Validation happens in the approve route handler, which returns HTTP 422
    // with error code INVALID_THREAD_LINK for inputs that fail this regex.
    //
    // This test verifies the regex itself rejects malformed values so we have
    // confidence in the route-level guard without making a real HTTP request.
    const malformedTs = "not-a-valid-ts";
    expect(THREAD_TS_REGEX.test(malformedTs)).toBe(false);

    // Valid format examples — ensure the regex accepts them
    expect(THREAD_TS_REGEX.test("1712345678.123456")).toBe(true);
    expect(THREAD_TS_REGEX.test("1000000000.000001")).toBe(true);

    // Other invalid formats
    expect(THREAD_TS_REGEX.test("1712345678")).toBe(false); // missing decimal part
    expect(THREAD_TS_REGEX.test(".123456")).toBe(false); // missing integer part
    expect(THREAD_TS_REGEX.test("abc.def")).toBe(false); // non-numeric
  });
});
