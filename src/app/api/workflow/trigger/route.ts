import { type NextRequest, NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google/auth";
import { getLatestOrganizerEvent } from "@/lib/google/calendar";
import { searchDriveForDoc } from "@/lib/google/drive";

export async function POST(req: NextRequest) {
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Fetch most recent organizer-owned Calendar event.
  let event: Awaited<ReturnType<typeof getLatestOrganizerEvent>>;
  try {
    event = await getLatestOrganizerEvent(accessToken);
  } catch (err) {
    if (err instanceof Error && err.message === "NO_RECENT_EVENT") {
      return NextResponse.json(
        { error: "NO_RECENT_EVENT", message: "No recent organizer-owned event found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "CALENDAR_API_ERROR", message: String(err) },
      { status: 502 }
    );
  }

  // Search Drive for Docs matching the event title.
  let matches: Awaited<ReturnType<typeof searchDriveForDoc>>;
  try {
    matches = await searchDriveForDoc(accessToken, event.title);
  } catch (err) {
    return NextResponse.json(
      { error: "DRIVE_API_ERROR", message: String(err) },
      { status: 502 }
    );
  }

  return NextResponse.json({ event, matches });
}
