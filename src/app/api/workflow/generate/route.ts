import { type NextRequest, NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google/auth";
import { extractTranscript } from "@/lib/google/docs";
import { generateSummary } from "@/lib/ai/generate";
import { createWorkflowRun } from "@/lib/supabase/queries/workflow-runs";
import type { StructuredDataRecord } from "@/types/structured-data";

type GenerateRequest = {
  doc_id: string;
  meeting_title: string;
  meeting_date: string;
  meeting_duration_minutes: number; // from trigger phase; not in spec's request body — see Amendment 011
  project_id: string;
};

export async function POST(req: NextRequest) {
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { doc_id, meeting_title, meeting_date, meeting_duration_minutes, project_id } = body;

  if (!doc_id || !meeting_title || !meeting_date || !project_id) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "doc_id, meeting_title, meeting_date, and project_id are required." },
      { status: 400 }
    );
  }

  // Extract raw transcript from the confirmed Google Doc.
  let transcript: string;
  try {
    transcript = await extractTranscript(accessToken, doc_id);
  } catch (err) {
    if (err instanceof Error && err.message === "TRANSCRIPT_NOT_FOUND") {
      return NextResponse.json(
        { error: "TRANSCRIPT_NOT_FOUND", message: "Could not locate '📖 Transcript' heading in document." },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "DOCS_API_ERROR", message: String(err) },
      { status: 502 }
    );
  }

  // Generate summary and structured records via the AI abstraction layer.
  let aiResult: Awaited<ReturnType<typeof generateSummary>>;
  try {
    aiResult = await generateSummary(transcript, meeting_title);
  } catch (err) {
    return NextResponse.json(
      { error: "AI_PROVIDER_ERROR", message: String(err) },
      { status: 502 }
    );
  }

  // Enrich AI records with meeting context before returning.
  // meeting_title and meeting_date are not returned by the AI (Section 5 — AiRecord).
  const records: StructuredDataRecord[] = aiResult.records.map((r) => ({
    ...r,
    meeting_title,
    meeting_date,
  }));

  // Create the workflow run record. Delivery statuses are set to "skipped"
  // as placeholders and updated by /api/workflow/approve (Amendment 011).
  const run = await createWorkflowRun({
    meeting_title,
    meeting_date,
    meeting_duration_minutes: meeting_duration_minutes ?? 0,
    gemini_doc_id: doc_id,
    project_id,
    ai_provider: (process.env.AI_PROVIDER ?? "gemini") as "anthropic" | "gemini",
    approval_status: "approved",
    slack_status: "skipped",
    destination_status: "skipped",
    slack_thread_ts: null,
  });

  // run_id is an addition to the spec's response shape — see Amendment 011.
  return NextResponse.json({
    run_id: run.id,
    summary: aiResult.summary,
    records,
  });
}
