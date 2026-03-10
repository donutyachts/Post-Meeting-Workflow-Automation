import { type NextRequest, NextResponse } from "next/server";
import { updateWorkflowRunDelivery } from "@/lib/supabase/queries/workflow-runs";

type DiscardRequest = {
  run_id: string;
};

// Logs a workflow run as discarded without posting to Slack or writing to
// Notion/Sheets (Section 3.6). Nothing is delivered; only the run record
// is updated.
export async function POST(req: NextRequest) {
  let body: DiscardRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { run_id } = body;

  if (!run_id) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "run_id is required." },
      { status: 400 }
    );
  }

  try {
    await updateWorkflowRunDelivery(run_id, {
      approval_status: "discarded",
      slack_status: "skipped",
      destination_status: "skipped",
      slack_thread_ts: null,
    });
  } catch {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Workflow run not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ discarded: true });
}
