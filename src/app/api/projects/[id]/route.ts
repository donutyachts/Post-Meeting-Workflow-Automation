import { type NextRequest, NextResponse } from "next/server";
import { updateProject, deleteProject } from "@/lib/supabase/queries/projects";
import type { UpdateProjectInput } from "@/types/project";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  let body: UpdateProjectInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (
    body.destination_type !== undefined &&
    body.destination_type !== "notion" &&
    body.destination_type !== "sheets"
  ) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "destination_type must be 'notion' or 'sheets'." },
      { status: 400 }
    );
  }

  try {
    const project = await updateProject(id, body);
    if (!project) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Project not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ project });
  } catch (err) {
    return NextResponse.json(
      { error: "DATABASE_ERROR", message: String(err) },
      { status: 502 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    const deleted = await deleteProject(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Project not found." },
        { status: 404 }
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json(
      { error: "DATABASE_ERROR", message: String(err) },
      { status: 502 }
    );
  }
}
