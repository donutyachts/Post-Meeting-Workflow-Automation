import { type NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/supabase/queries/projects";
import type { CreateProjectInput } from "@/types/project";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ projects });
  } catch (err) {
    return NextResponse.json(
      { error: "DATABASE_ERROR", message: String(err) },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: Partial<CreateProjectInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { name, slack_channel_id, slack_channel_name, destination_type, destination_id, destination_name } = body;

  if (!name || !slack_channel_id || !slack_channel_name || !destination_type || !destination_id || !destination_name) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "name, slack_channel_id, slack_channel_name, destination_type, destination_id, and destination_name are required." },
      { status: 400 }
    );
  }

  if (destination_type !== "notion" && destination_type !== "sheets") {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "destination_type must be 'notion' or 'sheets'." },
      { status: 400 }
    );
  }

  try {
    const project = await createProject({ name, slack_channel_id, slack_channel_name, destination_type, destination_id, destination_name });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "DATABASE_ERROR", message: String(err) },
      { status: 502 }
    );
  }
}
