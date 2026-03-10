import { google } from "googleapis";
import { buildGoogleAuthClient } from "./auth";

export type CalendarEvent = {
  title: string;
  date: string;            // ISO 8601 date, e.g. "2026-03-04"
  start_time: string;      // ISO 8601 datetime with UTC offset
  duration_minutes: number;
};

/**
 * Returns the most recent past Google Calendar event where the authenticated
 * user is the organizer (Section 3.1).
 *
 * Searches the primary calendar over the past 30 days, iterates in reverse
 * chronological order, and returns the first organizer-owned event found.
 *
 * Throws "NO_RECENT_EVENT" if no qualifying event exists in the window.
 */
export async function getLatestOrganizerEvent(
  accessToken: string
): Promise<CalendarEvent> {
  const auth = buildGoogleAuthClient(accessToken);
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: thirtyDaysAgo.toISOString(),
    timeMax: now.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  const events = response.data.items ?? [];

  // Iterate in reverse so the most recent event is checked first.
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];

    // Must be organizer-owned, have explicit start/end times, and have a title.
    if (!event.organizer?.self) continue;
    if (!event.start?.dateTime || !event.end?.dateTime) continue;
    if (!event.summary) continue;

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const duration_minutes = Math.round(
      (end.getTime() - start.getTime()) / 60_000
    );

    return {
      title: event.summary,
      date: event.start.dateTime.slice(0, 10),
      start_time: event.start.dateTime,
      duration_minutes,
    };
  }

  throw new Error("NO_RECENT_EVENT");
}
