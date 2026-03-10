import { NextResponse } from "next/server";
import { listWorkflowRuns } from "@/lib/supabase/queries/workflow-runs";

export async function GET() {
  try {
    const runs = await listWorkflowRuns();
    return NextResponse.json({ runs });
  } catch (err) {
    return NextResponse.json(
      { error: "DATABASE_ERROR", message: String(err) },
      { status: 502 }
    );
  }
}
