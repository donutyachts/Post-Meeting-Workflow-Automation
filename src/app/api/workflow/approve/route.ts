import { type NextRequest, NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google/auth";
import { postToSlack } from "@/lib/slack/client";
import { appendRecordToNotion } from "@/lib/notion/client";
import { appendRecordsToSheet } from "@/lib/google/sheets";
import { getProjectById } from "@/lib/supabase/queries/projects";
import {
  updateWorkflowRunDelivery,
  patchWorkflowRunDelivery,
} from "@/lib/supabase/queries/workflow-runs";
import type { StructuredDataRecord } from "@/types/structured-data";
import type { DeliveryStatus } from "@/types/workflow-run";

type ApproveRequest = {
  run_id: string;
  summary: string;
  records: StructuredDataRecord[];
  slack_thread_ts?: string | null;
  // When present, only the named operation is attempted; the other is not
  // touched. Used by the retry buttons on the post-approval result screen.
  retry_only?: "slack" | "destination";
};

export async function POST(req: NextRequest) {
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: ApproveRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { run_id, summary, records, slack_thread_ts, retry_only } = body;

  if (!run_id || !summary || !Array.isArray(records)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "run_id, summary, and records are required." },
      { status: 400 }
    );
  }

  // Look up the project configuration for this run.
  // The run already has project_id from the generate step — fetch via Supabase.
  // We query the project directly by looking up the run's project via the
  // run_id. Since WorkflowRun stores project_id, we need to join or do
  // two queries. Here we rely on the client passing sufficient context;
  // the run row itself is looked up to get project_id.
  //
  // Simpler: the generate step returned project_id to the client, so the
  // client passes it in the approve request. project_id is implicitly
  // available via run lookup — we re-fetch from the run record.
  // For now the client must send project_id (see Amendment 012).

  // Temporary: project_id must be resolvable from the stored run.
  // We retrieve the project using the run's stored project_id which
  // requires a run lookup. Since the run was just created in /generate,
  // the project_id is available. We use a Supabase join via separate query.
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = createServerSupabaseClient();

  const { data: runRow, error: runError } = await supabase
    .from("workflow_runs")
    .select("project_id")
    .eq("id", run_id)
    .single();

  if (runError || !runRow) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Workflow run not found." },
      { status: 404 }
    );
  }

  if (!runRow.project_id) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Run has no associated project." },
      { status: 404 }
    );
  }

  const project = await getProjectById(runRow.project_id);
  if (!project) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Project not found." },
      { status: 404 }
    );
  }

  // Validate thread_ts format before attempting any posting.
  // A raw Slack message link (URL) is not accepted — the client must extract
  // the thread_ts value before sending. Format: digits.digits e.g. "1772639685.263439".
  if (slack_thread_ts != null && !/^\d+\.\d+$/.test(slack_thread_ts)) {
    return NextResponse.json(
      {
        error: "INVALID_THREAD_LINK",
        message: "Could not resolve thread_ts from provided Slack link.",
      },
      { status: 422 }
    );
  }

  // ---------------------------------------------------------------------------
  // Retry path — only one operation is attempted; the other is not touched.
  // patchWorkflowRunDelivery writes only the fields provided so the already-
  // settled status of the other operation is preserved in the database.
  // ---------------------------------------------------------------------------

  if (retry_only === "slack") {
    let slackStatus: DeliveryStatus = "failed";
    let slackError: string | undefined;

    try {
      await postToSlack(project.slack_channel_id, summary, slack_thread_ts);
      slackStatus = "success";
    } catch (err) {
      slackError = `SLACK_API_ERROR: ${String(err)}`;
    }

    await patchWorkflowRunDelivery(run_id, {
      slack_status: slackStatus,
      slack_thread_ts: slack_thread_ts ?? null,
    });

    const responseBody = {
      slack_status: slackStatus,
      ...(slackError ? { slack_error: slackError } : {}),
    };
    return NextResponse.json(responseBody, {
      status: slackStatus === "failed" ? 207 : 200,
    });
  }

  if (retry_only === "destination") {
    let destinationStatus: DeliveryStatus = "failed";
    let destinationError: string | undefined;

    try {
      if (project.destination_type === "notion") {
        for (const record of records) {
          await appendRecordToNotion(project.destination_id, record);
        }
      } else {
        await appendRecordsToSheet(accessToken, project.destination_id, records);
      }
      destinationStatus = "success";
    } catch (err) {
      destinationError =
        project.destination_type === "notion"
          ? `NOTION_API_ERROR: ${String(err)}`
          : `SHEETS_API_ERROR: ${String(err)}`;
    }

    await patchWorkflowRunDelivery(run_id, { destination_status: destinationStatus });

    const responseBody = {
      destination_status: destinationStatus,
      ...(destinationError ? { destination_error: destinationError } : {}),
    };
    return NextResponse.json(responseBody, {
      status: destinationStatus === "failed" ? 207 : 200,
    });
  }

  // ---------------------------------------------------------------------------
  // Normal approval path — both operations run independently (Section 4.3).
  // ---------------------------------------------------------------------------

  let slackStatus: DeliveryStatus = "skipped";
  let slackError: string | undefined;

  let destinationStatus: DeliveryStatus = "skipped";
  let destinationError: string | undefined;

  // --- Slack ---
  try {
    await postToSlack(project.slack_channel_id, summary, slack_thread_ts);
    slackStatus = "success";
  } catch (err) {
    slackStatus = "failed";
    slackError = `SLACK_API_ERROR: ${String(err)}`;
  }

  // --- Notion or Sheets ---
  try {
    if (project.destination_type === "notion") {
      for (const record of records) {
        await appendRecordToNotion(project.destination_id, record);
      }
    } else {
      await appendRecordsToSheet(accessToken, project.destination_id, records);
    }
    destinationStatus = "success";
  } catch (err) {
    destinationStatus = "failed";
    destinationError =
      project.destination_type === "notion"
        ? `NOTION_API_ERROR: ${String(err)}`
        : `SHEETS_API_ERROR: ${String(err)}`;
  }

  // Persist final delivery statuses on the run record.
  await updateWorkflowRunDelivery(run_id, {
    approval_status: "approved",
    slack_status: slackStatus,
    destination_status: destinationStatus,
    slack_thread_ts: slack_thread_ts ?? null,
  });

  const responseBody = {
    slack_status: slackStatus,
    destination_status: destinationStatus,
    ...(slackError ? { slack_error: slackError } : {}),
    ...(destinationError ? { destination_error: destinationError } : {}),
  };

  // 207 if either operation failed; 200 if both succeeded.
  const status =
    slackStatus === "failed" || destinationStatus === "failed" ? 207 : 200;

  return NextResponse.json(responseBody, { status });
}
