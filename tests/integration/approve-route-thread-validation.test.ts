import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Route-level integration test: POST /api/workflow/approve — thread_ts validation
 *
 * Sends requests with malformed slack_thread_ts values directly to the route
 * handler and asserts HTTP 422 with error code INVALID_THREAD_LINK.
 *
 * The 422 guard fires after the run/project lookups but before any Slack or
 * Notion call, so only auth and the Supabase lookups need to be stubbed.
 * No real API credentials are required; this test is entirely self-contained.
 *
 * What is mocked / why:
 *   - @/lib/google/auth                  — getGoogleAccessToken reads a signed
 *                                          NextAuth JWT cookie; not resolvable
 *                                          outside a running Next.js context.
 *   - @/lib/supabase/server              — inline dynamic import inside the
 *                                          route handler; must return a
 *                                          controlled project_id.
 *   - @/lib/supabase/queries/projects    — getProjectById must return a non-null
 *                                          project so the route reaches the
 *                                          thread_ts validation block.
 *   - @/lib/supabase/queries/workflow-runs — imported by the route; stubbed so
 *                                            no DB writes occur if a code path
 *                                            ever reaches the delivery section.
 */

vi.mock("@/lib/google/auth", () => ({
  getGoogleAccessToken: vi.fn().mockResolvedValue("stub-access-token"),
  buildGoogleAuthClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
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

vi.mock("@/lib/supabase/queries/projects", () => ({
  getProjectById: vi.fn().mockResolvedValue({
    id: "test-project-id",
    name: "Test Project",
    slack_channel_id: "C000000TEST",
    slack_channel_name: "test-channel",
    destination_type: "notion",
    destination_id: "00000000-0000-0000-0000-000000000001",
    destination_name: "Test DB",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }),
}));

vi.mock("@/lib/supabase/queries/workflow-runs", () => ({
  updateWorkflowRunDelivery: vi.fn().mockResolvedValue(undefined),
  patchWorkflowRunDelivery: vi.fn().mockResolvedValue(undefined),
  createWorkflowRun: vi.fn(),
  listWorkflowRuns: vi.fn(),
}));

import { POST } from "@/app/api/workflow/approve/route";

// Minimal valid body fields — the test varies only slack_thread_ts.
const BASE_BODY = {
  run_id: "00000000-0000-0000-0000-000000000002",
  summary: ":information_desk_person: Brief notes from today's thread validation test.",
  records: [
    {
      category: "Action items",
      description: "Thread validation test record",
      owner: null,
      due_date: null,
      meeting_title: "Thread Validation Test",
      meeting_date: "2026-03-10",
    },
  ],
};

function makeRequest(slack_thread_ts: string) {
  return new NextRequest("http://localhost:3000/api/workflow/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...BASE_BODY, slack_thread_ts }),
  });
}

describe("POST /api/workflow/approve — thread_ts validation (route level)", () => {
  it("returns 422 INVALID_THREAD_LINK for a full Slack message URL", async () => {
    const response = await POST(
      makeRequest("https://acme.slack.com/archives/C123/p1712345678123456")
    );

    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toBe("INVALID_THREAD_LINK");
    expect(typeof data.message).toBe("string");
  });

  it("returns 422 INVALID_THREAD_LINK for a bare integer with no decimal", async () => {
    const response = await POST(makeRequest("1712345678"));

    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toBe("INVALID_THREAD_LINK");
  });

  it("returns 422 INVALID_THREAD_LINK for a non-numeric string", async () => {
    const response = await POST(makeRequest("not-a-valid-ts"));

    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toBe("INVALID_THREAD_LINK");
  });

  it("does not return 422 when slack_thread_ts is a valid digits.digits value", async () => {
    // The route proceeds past the validation guard; the actual delivery outcome
    // depends on external services and is not asserted here. The only invariant
    // checked is that the response is NOT 422.
    const response = await POST(makeRequest("1712345678.123456"));

    expect(response.status).not.toBe(422);
  });

  it("does not return 422 when slack_thread_ts is omitted (null / undefined)", async () => {
    const req = new NextRequest("http://localhost:3000/api/workflow/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // slack_thread_ts absent — route treats it as null and skips validation
      body: JSON.stringify(BASE_BODY),
    });

    const response = await POST(req);

    expect(response.status).not.toBe(422);
  });
});
