import { type NextRequest, NextResponse } from "next/server";
import type { DriveMatch } from "@/lib/google/drive";

type MatchRequest = {
  event: {
    date: string;           // ISO 8601 date, used for tiebreaking
    duration_minutes: number;
  };
  candidates: DriveMatch[];
};

// Applies Section 3.2 tiebreaker logic to a set of Drive candidates.
//
// Step 1: filter to candidates whose doc_date matches the event date.
//   - If one remains → resolved.
//   - If none remain → fall back to all candidates (no date information available).
//   - If multiple remain → continue to step 2.
//
// Step 2 (duration tiebreaker) is not implemented here. Parsing the meeting
// duration from the transcript requires fetching Doc content, which is the
// /api/workflow/generate step. If date filtering still leaves multiple
// candidates, they are returned as ambiguous for manual selection (Section 3.2).
export async function POST(req: NextRequest) {
  let body: MatchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { event, candidates } = body;

  if (!event || !Array.isArray(candidates)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "event and candidates are required." },
      { status: 400 }
    );
  }

  // No candidates — nothing to match.
  if (candidates.length === 0) {
    return NextResponse.json({ resolved: null, ambiguous: [] });
  }

  // Single candidate — present directly for user confirmation.
  if (candidates.length === 1) {
    return NextResponse.json({ resolved: candidates[0], ambiguous: [] });
  }

  // Step 1: filter by date.
  const dateMatches = candidates.filter((c) => c.doc_date === event.date);

  if (dateMatches.length === 1) {
    return NextResponse.json({ resolved: dateMatches[0], ambiguous: [] });
  }

  // Date filtering narrowed to zero — fall back to all candidates.
  const pool = dateMatches.length === 0 ? candidates : dateMatches;

  // Step 2 (duration tiebreaker) would go here. Not implemented — duration
  // requires fetching Doc content. Return remaining candidates as ambiguous
  // for manual selection.
  return NextResponse.json({ resolved: null, ambiguous: pool });
}
