import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { testEnv } from "./helpers/env";
import type { StructuredDataRecord } from "@/types/structured-data";

/**
 * Route-level integration test: POST /api/workflow/approve — partial failure
 *
 * Calls the route handler directly (not via HTTP) to verify that the route
 * correctly returns HTTP 207 with { slack_status: "success",
 * destination_status: "failed" } when Slack succeeds but the destination
 * write fails.
 *
 * What is mocked / why:
 *   - @/lib/google/auth         — getGoogleAccessToken reads a signed NextAuth
 *                                 JWT cookie; impossible to satisfy outside a
 *                                 running Next.js request context.
 *   - @/lib/supabase/server     — the run-lookup inside the route handler body
 *                                 needs to return a controlled project_id.
 *   - @/lib/supabase/queries/projects
 *                               — getProjectById must return a project pointing
 *                                 at the real test channel / database IDs so the
 *                                 live Slack and Notion calls target the right
 *                                 resources.
 *   - @/lib/supabase/queries/workflow-runs
 *                               — updateWorkflowRunDelivery writes back to the
 *                                 test Supabase DB; a no-op stub keeps the test
 *                                 self-contained and avoids polluting run history.
 *
 * What is NOT mocked / why:
 *   - @/lib/slack/client        — real Slack post to TEST_SLACK_CHANNEL_ID;
 *                                 the test asserts this succeeds with live creds.
 *   - @/lib/notion/client       — module-level singleton; re-initialised after
 *                                 vi.resetModules() with the stubbed invalid key
 *                                 so the API call fails as expected.
 */

const FAKE_RUN_ID = "00000000-0000-0000-0000-000000000001";

const SAMPLE_SUMMARY =
  ":information_desk_person: Brief notes from today's partial-failure route test.";

const SAMPLE_RECORDS: StructuredDataRecord[] = [
  {
    category: "Action items",
    description: "Route-level partial failure test record",
    owner: null,
    due_date: null,
    meeting_title: "Partial Failure Route Test",
    meeting_date: "2026-03-10",
  },
];

describe("POST /api/workflow/approve — partial failure (route level)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns 207 with slack_status: success and destination_status: failed when Notion key is invalid", async () => {
    const channelId = testEnv.slackChannelId();
    const databaseId = testEnv.notionDatabaseId();

    // Stub NOTION_API_KEY BEFORE resetting modules. The Notion client is a
    // module-level singleton (new Client({ auth: process.env.NOTION_API_KEY })),
    // so the stub must be in place before the module is first imported after
    // vi.resetModules() clears the registry.
    vi.stubEnv("NOTION_API_KEY", "sk_invalid_key_for_partial_failure_route_test");
    vi.resetModules();

    // Register all mocks AFTER vi.resetModules() using vi.doMock (non-hoisted).
    // These are picked up when the route module is dynamically imported below.

    vi.doMock("@/lib/google/auth", () => ({
      getGoogleAccessToken: vi.fn().mockResolvedValue("stub-access-token"),
      buildGoogleAuthClient: vi.fn(),
    }));

    // The route performs `await import("@/lib/supabase/server")` inside the
    // handler body to look up the run's project_id. Return a minimal stub.
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { project_id: "test-project-id" },
                  error: null,
                }),
            }),
          }),
        }),
      }),
    }));

    // Return a project pointing at the REAL test channel and Notion database so
    // the live Slack post and the (deliberately failing) Notion write target the
    // correct resources.
    vi.doMock("@/lib/supabase/queries/projects", () => ({
      getProjectById: vi.fn().mockResolvedValue({
        id: "test-project-id",
        name: "Test Project",
        slack_channel_id: channelId,
        slack_channel_name: "test-channel",
        destination_type: "notion",
        destination_id: databaseId,
        destination_name: "Test DB",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }),
    }));

    // No-op stub — prevents writes to the test Supabase instance.
    vi.doMock("@/lib/supabase/queries/workflow-runs", () => ({
      updateWorkflowRunDelivery: vi.fn().mockResolvedValue(undefined),
      patchWorkflowRunDelivery: vi.fn().mockResolvedValue(undefined),
      createWorkflowRun: vi.fn(),
      listWorkflowRuns: vi.fn(),
    }));

    // Import AFTER all doMock calls so the freshly loaded route resolves its
    // static imports against the registered mocks.
    const { POST } = await import("@/app/api/workflow/approve/route");

    const req = new NextRequest(
      "http://localhost:3000/api/workflow/approve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: FAKE_RUN_ID,
          summary: SAMPLE_SUMMARY,
          records: SAMPLE_RECORDS,
        }),
      }
    );

    const response = await POST(req);

    // 207 = partial success — at least one delivery operation failed
    expect(response.status).toBe(207);

    const data = await response.json();

    // Slack used real credentials against the test channel — must succeed
    expect(data.slack_status).toBe("success");
    expect(data.slack_error).toBeUndefined();

    // Notion used an invalid API key — must fail and surface the error key
    expect(data.destination_status).toBe("failed");
    expect(data.destination_error).toMatch(/NOTION_API_ERROR/);
  });
});
