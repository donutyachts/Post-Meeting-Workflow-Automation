# Post-Meeting Workflow Automation — Specification


---

## 0. POC Scope and Infrastructure Note
This specification is being built and validated as a proof of concept on personal accounts. The following infrastructure decisions are POC-specific and are not intended as permanent:

- Google Cloud Project: personal Google account; not a HostPapa Google Workspace account
- Google Calendar and Drive: personal Google account used as test fixtures; a real Gemini Notes Doc copied from a work meeting is used as the transcript source
- Notion: personal Notion account
- AI provider: Google Gemini via Google AI Studio free tier
- Vercel: personal or free tier account
- Slack: company Slack workspace; Slack bot created and owned by the spec author directly

---

## 1. Overview

### Problem Statement

A project manager running multiple concurrent projects must produce a structured meeting summary after every meeting, post it to the relevant project Slack channel, and log structured data (action items, decisions, changes, and other categorized items) to a Notion database or Google Sheets spreadsheet. Today this is done manually. The time cost limits how many projects and meetings the PM can handle, reduces summary quality, and creates delays that cause team misalignment and project drift.

### Goals

- Eliminate manual meeting summary writing entirely
- Automate posting to Slack and writing to Notion or Google Sheets, subject to user approval before either action executes
- Produce summaries that match the user's established style and section taxonomy consistently
- Reduce post-meeting admin time to under two minutes (review and approve only)
- Enable the user to take on more projects and meetings without sacrificing team alignment

### How It Works (User-Facing Flow)

1. User opens the app and clicks **Trigger**
2. App identifies the most recent Google Calendar event where the user is the organizer
3. App searches Google Drive for a Gemini Notes Doc matching the meeting title, using date and duration as tiebreakers; falls back to manual selection if no unambiguous match is found
4. User confirms the matched Doc or manually selects the correct one
5. User assigns the meeting to a configured project
6. App extracts the raw transcript from the Doc, ignores the Gemini-generated summary, and sends the transcript to the AI
7. AI generates a structured bullet-point summary and extracts structured data records, both conforming to the predefined section taxonomy
8. User reviews and edits the summary and structured data in the approval UI
9. User approves — app posts the summary to the project's Slack channel and writes structured data to the project's Notion database or Google Sheet
10. App confirms successful delivery

### Success Criteria

- Summary style and section taxonomy are consistent with the user's established format across all meetings
- No summary or structured data is posted or written without explicit user approval
- The correct Slack channel and destination (Notion or Sheets) are always derived from the project configuration — never entered manually at post time
- The app handles missing or ambiguous Gemini Notes Docs gracefully without breaking the workflow
- End-to-end flow from trigger to approval takes under two minutes for a typical meeting

---

## 2. Architecture

### System Overview

A single-user Next.js web app deployed on Vercel. The user interacts exclusively through the web UI. All external service calls are made server-side via Next.js API routes. No background jobs, no webhooks, no queue — the workflow is entirely user-initiated and synchronous within a single session.

### Components

**Frontend (Next.js — App Router)**

- Trigger screen — initiates the workflow
- Doc confirmation screen — displays the auto-matched Gemini Notes Doc for user confirmation or manual override
- Project selection screen — assigns the confirmed Doc to a configured project
- Approval screen — displays the AI-generated summary and extracted structured data for review and editing before posting
- Project management screen — CRUD interface for project configurations

**Backend (Next.js API Routes)**

- `/api/workflow/trigger` — fetches the most recent organizer-owned Calendar event and initiates Drive search
- `/api/workflow/match` — executes filename, date, and duration matching logic against Drive results
- `/api/workflow/generate` — extracts raw transcript from the confirmed Doc, passes it to the AI provider abstraction layer, and returns the structured summary and extracted data records; the abstraction layer routes to Anthropic Claude or Google Gemini based on the `AI_PROVIDER` environment variable
- `/api/workflow/approve` — on user approval, posts to Slack and writes to Notion or Google Sheets
- `/api/projects` — CRUD for project configuration records
- `/api/auth/[...nextauth]` — Google OAuth handler

**Supabase (PostgreSQL)**

- Stores project configuration records
- Stores workflow run history (meeting title, date, project assigned, approval status, delivery status)

**External Services**

- Google Calendar API — fetch recent events, derive meeting duration
- Google Drive API — search for Gemini Notes Docs by filename
- Google Docs API — extract raw transcript content from confirmed Doc
- AI Provider (configurable) — generate summary and extract structured data from transcript; supported providers are Anthropic Claude and Google Gemini (via Google AI Studio API); active provider is set via environment variable; provider is abstracted behind a common internal interface so switching providers requires no code changes
- Slack API — post approved summary to configured channel
- Notion API — write approved structured data to configured database
- Google Sheets API — write approved structured data to configured spreadsheet

### Data Flow

```
User clicks Trigger
  → API: fetch latest organizer event from Google Calendar
  → API: search Google Drive for Doc matching meeting title
  → Match logic: filter by date → filter by duration → surface ambiguous matches for manual selection
  → User confirms Doc
  → User selects project
  → API: fetch raw transcript from Google Docs
  → API: send transcript to AI Provider (via abstraction layer)
  → AI returns: structured summary + extracted data records
  → User reviews and edits in approval UI
  → User approves
  → API: post summary to Slack (project config)
  → API: write structured data to Notion OR Google Sheets (project config)
  → Workflow run logged to Supabase
  → UI confirms delivery
```

### Auth

- Single Google OAuth 2.0 connection via NextAuth.js
- Scopes required: `https://www.googleapis.com/auth/calendar.readonly`, `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/documents.readonly`
- Slack, Notion, and Google Sheets credentials are stored per-project in Supabase as encrypted environment-level secrets, not per-user OAuth — see Section 10: Open Questions for the Notion and Sheets auth approach
- No multi-user auth, no roles, no session sharing

### Deployment

- Vercel (frontend + API routes)
- Supabase (database)
- Environment variables manage all API keys and OAuth credentials

---

## 3. Functional Requirements

### 3.1 Workflow Trigger

- The app provides a single **Trigger** button on the home screen to initiate the workflow
- On trigger, the app calls the Google Calendar API to fetch the most recent event where the authenticated user is the organizer
- The Calendar API does not support descending orderBy for event queries; the implementation fetches events from the past 30 days ordered ascending by start time and iterates in reverse to identify the most recent qualifying event. If no organizer-owned event is found within the 30-day window, the app returns NO_RECENT_EVENT.
- The event title, date, start time, and duration are extracted and used in subsequent steps
- If no qualifying event is found, the app displays an error message and offers a manual Doc selection fallback

### 3.2 Gemini Notes Doc Matching

- The app searches Google Drive for Docs whose filename matches the Calendar event title (exact match first, then partial match)
- If exactly one match is found, it is presented to the user for confirmation
- If multiple matches are found, the app applies tiebreakers in this order:
  1. Parse the date from the top of the Google Doc and match against the Calendar event date
  2. Parse the meeting duration from the transcript and match against the Calendar event duration
  3. If ambiguity remains, surface all remaining candidates for manual selection
- If no match is found at any stage, the app falls back to a manual Drive file picker
- The confirmation screen displays: meeting title, Calendar event date and time, matched Doc filename, and Doc creation date

### 3.3 Project Assignment

- After Doc confirmation, the user selects a project from a dropdown list of configured projects
- The selected project determines the Slack channel, destination type (Notion or Sheets), and destination ID used at approval time
- Project selection is required before the workflow can proceed to generation

### 3.4 Transcript Extraction

- The app fetches the full content of the confirmed Google Doc via the Google Docs API
- The boundary between the Gemini-generated content and the raw transcript is identified by locating the `# 📖 Transcript` heading in the document; everything above this heading is ignored, everything below it is extracted and passed to the AI
- The transcript contains timestamped section headers (e.g., `### 00:00:00`) and speaker labels formatted as bold names (e.g., `**Ionela Babas:`**); these are preserved in the extracted text passed to the AI but the AI prompt must instruct the model not to include timestamps or speaker labels in the generated summary output

### 3.5 AI Summary Generation

- The raw transcript is sent to the configured AI provider (Anthropic Claude or Google Gemini)
- The AI is prompted to produce two outputs in a single call:
  1. A structured bullet-point meeting summary
  2. A list of extracted structured data records
- The summary must conform to the following rules:
  - Header line format: `:information_desk_person: Brief notes from today's \`[Meeting Title] meeting`
  - Sections use bold labels (e.g., `*Action items`*, `*Conclusions*`) with no colon, on their own line
  - Bullets are single-sentence, concise, and declarative
  - Tone is neutral and factual
  - No attendee list, no date/time header, no closing line
  - Sections are drawn only from the predefined taxonomy: **Conclusions, Action items, Changes, Decisions, Things to know, Risks, Problems**
  - Only sections with content from the transcript are included — empty sections are omitted
- Structured data records mirror the summary sections: each record has a category (from the same taxonomy), a description, and optionally an owner and due date where inferable from the transcript

### 3.5.1 AI Prompt

The following prompt is defined in `lib/ai/generate.ts` and is used for both the Anthropic and Gemini providers without modification. The variables `{{MEETING_TITLE}}` and `{{TRANSCRIPT}}` are replaced at runtime before the prompt is sent.

```
You are an expert meeting notes assistant. Your job is to read a raw meeting transcript and produce two outputs: a formatted meeting summary and a list of structured data records.

---

MEETING TITLE: {{MEETING_TITLE}}

TRANSCRIPT:
{{TRANSCRIPT}}

---

INSTRUCTIONS

Read the transcript carefully. Ignore filler words, crosstalk, and off-topic conversation. Focus on what was concluded, decided, agreed upon, assigned, or flagged.

Produce your response as a single JSON object with two keys: "summary" and "records". Do not include any text outside the JSON object.

---

SUMMARY FORMAT

The summary must follow this exact format:

:information_desk_person: Brief notes from today's `{{MEETING_TITLE}}` meeting
*[Section Label]*
• [Bullet]
• [Bullet]
*[Section Label]*
• [Bullet]

Rules:
- Section labels must be bold using asterisks, e.g. *Action items*
- Section labels must come only from this list: Conclusions, Action items, Changes, Decisions, Things to know, Risks, Problems
- Only include sections that have content from the transcript — omit empty sections entirely
- Bullets must be single-sentence, concise, and declarative
- Tone is neutral and factual
- Do not include an attendee list, date, time, or closing line
- Do not include timestamps or speaker names
- Do not include the Gemini-generated summary or any content that precedes the raw transcript

---

RECORDS FORMAT

For each bullet in the summary, produce a corresponding structured data record.

Each record must be a JSON object with these fields:
- "category": one of — Conclusions, Action items, Changes, Decisions, Things to know, Risks, Problems
- "description": the bullet text, single sentence, declarative
- "owner": the full name of the person responsible, inferred from the transcript — or null if not identifiable
- "due_date": a date in ISO 8601 format (YYYY-MM-DD) if a deadline is stated or clearly implied in the transcript — or null if not present

---

RESPONSE SHAPE

Respond with only this JSON structure and nothing else:

{
  "summary": "...",
  "records": [
    {
      "category": "Action items",
      "description": "Eric to send Amy examples of the ecom provisioning issue to check if the script is wrong.",
      "owner": "Eric Arseneault",
      "due_date": null
    }
  ]
}
```

### 3.6 Approval UI

- The app presents the generated summary and structured data records side by side on the approval screen
- The user can edit the summary text inline before approving
- The user can edit, add, or delete individual structured data records before approving
- The approval screen displays the target Slack channel name and destination (Notion DB or Sheet name) derived from the project config, so the user can verify before posting
- The approval screen includes an optional **Slack thread link** field; if populated, the summary is posted as a reply to that message thread; if left blank, the summary is posted as a new top-level message
- Two actions are available: **Approve & Post** and **Discard**
- Discard cancels the workflow run without posting or writing anything; the run is logged as discarded

### 3.7 Slack Posting

- On approval, the app posts the summary to the Slack channel specified in the project configuration
- The approval screen includes an optional **Slack thread link** field; if populated, the summary is posted as a reply to that message thread; if left blank, the summary is posted as a new top-level message
- The app extracts the `thread_ts` from the provided Slack message link; if the link is malformed or the message cannot be found, the app displays an inline error and does not proceed with posting until the field is corrected or cleared
- The Slack message format preserves bold section labels and bullet points using Slack's mrkdwn formatting
- If the Slack API call fails, the app displays an error and does not mark the run as successfully delivered; the user can retry

### 3.8 Notion / Google Sheets Writing

- On approval, the app writes each structured data record to the destination specified in the project configuration
- **Notion:** each record is written as a new row in the configured Notion database; fields written are: Category, Description, Owner (if present), Due Date (if present), Meeting Title, Meeting Date
- **Google Sheets:** each record is appended as a new row in the configured Sheet; columns are: Category, Description, Owner, Due Date, Meeting Title, Meeting Date
- If the write call fails, the app displays an error and does not mark the run as successfully delivered; the user can retry independently of the Slack post (i.e., if Slack succeeded but Sheets failed, only the Sheets write is retried)
- Retry is manual — the user clicks a retry button on the error screen

### 3.9 Project Management

- The app includes a project management screen accessible from the main navigation
- The user can create, edit, and delete project configurations
- Each project configuration contains:
  - Project name
  - Slack channel ID
  - Destination type: `notion` or `sheets`
  - Destination ID: Notion database ID or Google Sheets spreadsheet ID
- Deleting a project does not delete any workflow run history associated with it

### 3.10 Workflow Run History

- The app logs every workflow run to Supabase with the following fields: meeting title, meeting date, project assigned, AI provider used, approval status (approved / discarded), Slack delivery status, destination delivery status, timestamp
- A run history screen displays past runs in reverse chronological order
- No editing of past runs is supported

---

## 4. Non-Functional Requirements

### 4.1 Performance

- The workflow from trigger to AI-generated summary displayed in the approval UI must complete in under 30 seconds for a transcript up to 60 minutes in length
- Slack posting and Notion/Sheets writing on approval must each complete in under 10 seconds
- The app must remain responsive during API calls — all long-running operations must show a loading state in the UI; the user must never see a frozen or unresponsive screen

### 4.2 Security

- All API keys (Anthropic, Google AI Studio, Slack, Notion, Google Sheets) are stored as environment variables in Vercel; they are never exposed to the client or stored in Supabase
- Google OAuth tokens are managed by NextAuth.js and stored server-side only; they are never exposed in API responses or client-side state
- Supabase row-level security (RLS) must be enabled on all tables; all queries must be scoped to the authenticated user
- The app does not store meeting transcripts or generated summaries in Supabase or any persistent storage; transcript content exists only in memory for the duration of a workflow run
- HTTPS is enforced on all routes via Vercel's default TLS; no HTTP fallback

### 4.3 Reliability

- If any external API call fails (Google Calendar, Drive, Docs, AI provider, Slack, Notion, Sheets), the app must display a clear error message identifying which step failed and offer a retry action where applicable
- Slack posting and Notion/Sheets writing are treated as independent operations at approval time; failure of one must not prevent or roll back the other
- The app must handle Google OAuth token expiry gracefully — if a token is expired, the user is prompted to re-authenticate without losing their current workflow state where possible

### 4.4 Scalability

- The app is designed for single-user, team-scale use; no multi-tenancy, no horizontal scaling requirements
- Supabase free or pro tier is sufficient; no read replicas or connection pooling required at this scale
- Vercel serverless functions handle all API routes; no persistent server process is required

### 4.5 Usability

- The workflow must be completable on a desktop browser; mobile is not a requirement but the UI must not be broken on mobile viewports
- The approval screen must allow inline editing of the summary and structured data records without requiring a separate edit mode or page navigation
- All destructive or irreversible actions (Approve & Post, Discard) must require a single explicit confirmation before executing

### 4.6 Maintainability

- The AI provider abstraction layer must be the only place in the codebase that references provider-specific SDKs (Anthropic or Google Gemini); switching providers must require changes only to the abstraction layer and environment variables
- Project configuration is managed entirely through the UI; no configuration requires code changes or redeployment

---

## 5. Data Models

### 5.1 Project

Stored in Supabase. One record per configured project.

```typescript
type Project = {
  id: string;                          // uuid, primary key
  name: string;                        // display name, e.g. "Brand Unification"
  slack_channel_id: string;            // Slack channel ID, e.g. "C08J9PLE20J"
  destination_type: "notion" | "sheets";
  destination_id: string;              // Notion database ID or Google Sheets spreadsheet ID
  created_at: string;                  // ISO 8601 timestamp
  updated_at: string;                  // ISO 8601 timestamp
}
```

### 5.2 WorkflowRun

Stored in Supabase. One record per completed or discarded workflow run.

```typescript
type WorkflowRun = {
  id: string;                          // uuid, primary key
  meeting_title: string;               // Google Calendar event title
  meeting_date: string;                // ISO 8601 date, e.g. "2026-03-04"
  meeting_duration_minutes: number;    // derived from Calendar event start/end
  gemini_doc_id: string;               // Google Drive file ID of the confirmed Gemini Notes Doc
  project_id: string;                  // foreign key → Project.id
  ai_provider: "anthropic" | "gemini"; // active provider at time of run
  approval_status: "approved" | "discarded";
  slack_status: "success" | "failed" | "skipped";
  destination_status: "success" | "failed" | "skipped";
  slack_thread_ts: string | null;      // thread_ts if posted as reply, null if top-level
  created_at: string;                  // ISO 8601 timestamp
}
```

### 5.3 StructuredDataRecord

Not persisted in Supabase. Exists in memory during the workflow run and is written directly to Notion or Google Sheets on approval.

```typescript
type StructuredDataRecord = {
  category:
    | "Conclusions"
    | "Action items"
    | "Changes"
    | "Decisions"
    | "Things to know"
    | "Risks"
    | "Problems";
  description: string;                 // single-sentence, declarative
  owner: string | null;                // person's name if inferable from transcript
  due_date: string | null;             // ISO 8601 date if inferable from transcript
  meeting_title: string;               // copied from WorkflowRun.meeting_title
  meeting_date: string;                // copied from WorkflowRun.meeting_date
}
```

### 5.4 AiRecord

Not persisted. Represents a single structured data record as returned directly by the AI provider, before the route handler enriches it with `meeting_title` and `meeting_date`. The `/api/workflow/generate` route handler is responsible for converting each `AiRecord` to a `StructuredDataRecord` before writing to Notion or Google Sheets.

```typescript
type AiRecord = {
  category: RecordCategory;
  description: string;        // single-sentence, declarative
  owner: string | null;
  due_date: string | null;    // ISO 8601 date or null
}
```

### 5.5 RecordCategory

```typescript
type RecordCategory =
  | "Conclusions"
  | "Action items"
  | "Changes"
  | "Decisions"
  | "Things to know"
  | "Risks"
  | "Problems";
```

5.6 GenerateResult

The return type of `generateSummary()` in `lib/ai/generate.ts`.

```typescript
type GenerateResult = {
  summary: string;       // formatted summary string per Section 3.5.1
  records: AiRecord[];
}
```

### 5.7 Notion Database Schema

The target Notion database must contain the following properties. The app does not create the database — it must be created manually and its ID added to the project configuration.

```
Name         → Title property     (maps to: description)
Category     → Select property    (options: Conclusions, Action items, Changes, Decisions, Things to know, Risks, Problems)
Owner        → Text property      (maps to: owner)
Due Date     → Date property      (maps to: due_date)
Meeting      → Text property      (maps to: meeting_title)
Meeting Date → Date property      (maps to: meeting_date)
```

### 5.8 Google Sheets Schema

The target Google Sheet must contain a header row with the following columns in this exact order. The app does not create the sheet — it must be created manually and its ID added to the project configuration.

```
Category | Description | Owner | Due Date | Meeting | Meeting Date
```

---

## 6. API Contracts

All API routes are Next.js server-side route handlers. All requests and responses are JSON. All routes require an authenticated session via NextAuth.js — unauthenticated requests return `401`.

---

### POST /api/workflow/trigger

Fetches the most recent Google Calendar event where the authenticated user is the organizer and initiates the Drive search.

**Request:** no body required

**Response 200**

```json
{
  "event": {
    "title": "Review service category mapping (EasyHosting) - Brand Unification",
    "date": "2026-03-04",
    "start_time": "2026-03-04T10:00:00-05:00",
    "duration_minutes": 40
  },
  "matches": [
    {
      "doc_id": "11ZWWv04HAiyVGJ3Bq_t6WHc8nNYPkoTQagxn-k7eoAw",
      "doc_title": "Review service category mapping (EasyHosting) - Brand Unification",
      "doc_date": "2026-03-04",
      "confidence": "exact"
    }
  ]
}
```

**Response 200 — no matches**

```json
{
  "event": { ... },
  "matches": []
}
```

**Error states**

```json
// 404 — no qualifying Calendar event found
{ "error": "NO_RECENT_EVENT", "message": "No recent organizer-owned event found." }

// 502 — Google Calendar API call failed
{ "error": "CALENDAR_API_ERROR", "message": "..." }

// 502 — Google Drive API call failed
{ "error": "DRIVE_API_ERROR", "message": "..." }
```

---

### POST /api/workflow/generate

Extracts the raw transcript from the confirmed Google Doc and sends it to the AI provider for summary and structured data generation.

**Request**

```json
{
  "doc_id": "11ZWWv04HAiyVGJ3Bq_t6WHc8nNYPkoTQagxn-k7eoAw",
  "meeting_title": "Review service category mapping (EasyHosting) - Brand Unification",
  "meeting_date": "2026-03-04",
  "project_id": "uuid"
}
```

**Response 200**

```json
{
  "summary": ":information_desk_person: Brief notes from today's `Review service category mapping (EasyHosting)` meeting\n*Conclusions*\n• ...\n*Action items*\n• ...",
  "records": [
    {
      "category": "Action items",
      "description": "Eric to send Amy examples of the ecom provisioning issue to check if the script is wrong.",
      "owner": "Eric Arseneault",
      "due_date": null
    },
    {
      "category": "Conclusions",
      "description": "Team re-aligned on the purpose of service category mapping and its impact on Engineering.",
      "owner": null,
      "due_date": null
    }
  ]
}
```

**Error states**

```json
// 422 — transcript boundary not found in Doc
{ "error": "TRANSCRIPT_NOT_FOUND", "message": "Could not locate '📖 Transcript' heading in document." }

// 502 — Google Docs API call failed
{ "error": "DOCS_API_ERROR", "message": "..." }

// 502 — AI provider call failed
{ "error": "AI_PROVIDER_ERROR", "message": "..." }
```

---

### POST /api/workflow/approve

Posts the approved summary to Slack and writes structured data records to Notion or Google Sheets.

**Request**

```json
{
  "run_id": "uuid",
  "summary": "...",
  "records": [ ... ],
  "slack_thread_ts": "1772639685.263439"
}
```

`slack_thread_ts` is optional. If omitted, the summary is posted as a top-level message.

**Response 200**

```json
{
  "slack_status": "success",
  "destination_status": "success"
}
```

**Response 207 — partial success**

```json
{
  "slack_status": "success",
  "destination_status": "failed",
  "destination_error": "NOTION_API_ERROR: ..."
}
```

**Error states**

```json
// 502 — Slack API call failed
{ "error": "SLACK_API_ERROR", "message": "..." }

// 502 — Notion API call failed
{ "error": "NOTION_API_ERROR", "message": "..." }

// 502 — Google Sheets API call failed
{ "error": "SHEETS_API_ERROR", "message": "..." }

// 422 — Slack thread link malformed or message not found
{ "error": "INVALID_THREAD_LINK", "message": "Could not resolve thread_ts from provided Slack link." }
```

---

### GET /api/projects

Returns all configured projects.

**Response 200**

```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Brand Unification",
      "slack_channel_id": "C08J9PLE20J",
      "destination_type": "notion",
      "destination_id": "notion-database-id",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/projects

Creates a new project configuration.

**Request**

```json
{
  "name": "Brand Unification",
  "slack_channel_id": "C08J9PLE20J",
  "destination_type": "notion",
  "destination_id": "notion-database-id"
}
```

**Response 201**

```json
{ "project": { ... } }
```

**Error states**

```json
// 400 — missing or invalid fields
{ "error": "VALIDATION_ERROR", "message": "..." }
```

---

### PATCH /api/projects/[id]

Updates an existing project configuration.

**Request:** any subset of `name`, `slack_channel_id`, `destination_type`, `destination_id`

**Response 200**

```json
{ "project": { ... } }
```

**Error states**

```json
// 404 — project not found
{ "error": "NOT_FOUND", "message": "Project not found." }
```

---

### DELETE /api/projects/[id]

Deletes a project configuration. Does not delete associated workflow run history.

**Response 204:** no body

**Error states**

```json
// 404 — project not found
{ "error": "NOT_FOUND", "message": "Project not found." }
```

---

### GET /api/runs

Returns workflow run history in reverse chronological order.

**Response 200**

```json
{
  "runs": [
    {
      "id": "uuid",
      "meeting_title": "...",
      "meeting_date": "2026-03-04",
      "project_id": "uuid",
      "ai_provider": "anthropic",
      "approval_status": "approved",
      "slack_status": "success",
      "destination_status": "success",
      "created_at": "2026-03-04T15:30:00Z"
    }
  ]
}
```

---

## 7. Tech Stack

### Language

- **TypeScript** throughout — frontend, API routes, and utility libraries
- No JavaScript, no Python

### Frontend / App Framework

- **Next.js 14** (App Router) — handles both the frontend and all API routes in a single deployment unit; chosen over a separate frontend/backend split because the app is simple enough that the overhead of two services is not justified

### Database

- **Supabase** (PostgreSQL + Auth) — stores project configurations and workflow run history; chosen for its managed PostgreSQL, built-in row-level security, and TypeScript client

### Auth

- **NextAuth.js v5** with Google OAuth 2.0 provider — handles session management and Google API token storage; chosen because it integrates directly with Next.js and supports Google's OAuth scopes natively

### AI Provider Abstraction

- **Anthropic TypeScript SDK** (`@anthropic-ai/sdk`) — used when `AI_PROVIDER=anthropic`
- **Google Generative AI SDK** (`@google/generative-ai`) — used when `AI_PROVIDER=gemini`
- Both SDKs are wrapped behind a single internal `lib/ai/generate.ts` module that exports one function: `generateSummary(transcript: string, meetingTitle: string): Promise<GenerateResult>`; no other part of the codebase imports either SDK directly

### External Service Clients

- **Google APIs Node.js Client** (`googleapis`) — used for Calendar, Drive, and Docs API calls
- **Slack Web API** (`@slack/web-api`) — used for posting messages
- **Notion SDK** (`@notionhq/client`) — used for writing records to Notion databases
- **Google Sheets via `googleapis`** — no separate SDK required; Sheets API is included in the same `googleapis` package used for Calendar, Drive, and Docs

### Deployment

- **Vercel** — deploys the Next.js app; serverless functions handle all API routes; chosen for zero-config Next.js deployment and built-in environment variable management
- **Supabase** — managed separately from Vercel; connected via environment variables

### Environment Variables

```bash
# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI Provider
AI_PROVIDER=gemini                  # or "anthropic"
#ANTHROPIC_API_KEY=                     # required if AI_PROVIDER=anthropic
GOOGLE_AI_STUDIO_API_KEY=              # required if AI_PROVIDER=gemini

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Slack
SLACK_BOT_TOKEN=

# Notion
NOTION_API_KEY=
```

Note: Google Sheets access is handled via the same Google OAuth token used for Calendar, Drive, and Docs — no separate API key required.

### Rationale for Deviations from Default Stack

None. This stack matches the default exactly.

---

## 8. Testing Requirements

Integration and end-to-end tests only. No unit tests unless explicitly requested.

### 8.1 Test Environment Setup

- A dedicated Supabase project for testing — separate from production; schema must mirror production exactly
- A dedicated Slack channel for test posts — never post to a live project channel during tests
- A dedicated Notion database and Google Sheet for test writes — pre-configured with the correct schema per Sections 5.4 and 5.5
- A real Google account with past Calendar events and past Gemini Notes Docs in Drive used as test fixtures — past meetings where the Doc exists and the title matches cleanly are preferred
- All environment variables must have test-specific equivalents (e.g., `TEST_SLACK_CHANNEL_ID`, `TEST_NOTION_DATABASE_ID`)
- AI provider calls in integration tests must use real API keys against real providers — mocking the AI response is not acceptable as it bypasses the prompt validation which is a core correctness concern

### 8.2 Integration Tests

**Google Calendar → Drive matching**

- Input: a Calendar event with a matching Gemini Notes Doc in Drive
- Expected: correct Doc returned with `confidence: "exact"`
- Input: a Calendar event with multiple Drive Docs matching the title
- Expected: tiebreaker logic applies date and duration filters; ambiguous matches are surfaced for manual selection
- Input: a Calendar event with no matching Doc in Drive
- Expected: empty `matches` array returned; no error thrown

**Google Docs transcript extraction**

- Input: a real Gemini Notes Doc containing both a Gemini summary section and a `# 📖 Transcript` heading
- Expected: only content below the `# 📖 Transcript` heading is extracted; Gemini summary content is absent from the extracted text
- Input: a Doc with no `# 📖 Transcript` heading
- Expected: `TRANSCRIPT_NOT_FOUND` error returned

**AI provider — summary generation**

- Input: a real extracted transcript, meeting title, and each supported provider (`anthropic`, `gemini`)
- Expected: response contains a non-empty `summary` string and a non-empty `records` array
- Expected: all records have a `category` value from the predefined taxonomy only
- Expected: `summary` string begins with `:information_desk_person: Brief notes from today's`
- Run this test against both providers independently to validate provider parity

**Slack posting**

- Input: approved summary, test Slack channel ID, no `slack_thread_ts`
- Expected: message appears in test channel as a top-level message
- Input: approved summary, test Slack channel ID, valid `slack_thread_ts`
- Expected: message appears as a thread reply to the correct parent message
- Input: malformed `slack_thread_ts`
- Expected: `INVALID_THREAD_LINK` error returned; no message posted

**Notion writing**

- Input: a set of structured data records with all field combinations (owner present, owner null, due date present, due date null)
- Expected: correct number of rows created in test Notion database; field values match input exactly

**Google Sheets writing**

- Input: same structured data records as Notion test above
- Expected: correct number of rows appended to test Sheet; column order matches schema in Section 5.5

**Partial approval failure**

- Input: valid summary and records; Notion API key intentionally invalid
- Expected: Slack post succeeds; destination write fails; response status is 207; `slack_status: "success"`, `destination_status: "failed"`

### 8.3 End-to-End Tests

**Full workflow — happy path (Notion)**

1. Trigger workflow
2. Confirm auto-matched Gemini Notes Doc
3. Assign to a project configured with Notion destination
4. Review generated summary and records in approval UI
5. Provide a valid Slack thread link
6. Approve

- Expected: summary appears as thread reply in test Slack channel; structured data records appear in test Notion database; workflow run logged in Supabase with `approval_status: "approved"`, `slack_status: "success"`, `destination_status: "success"`

**Full workflow — happy path (Google Sheets)**

- Same as above with a project configured with Sheets destination
- Expected: structured data records appended to test Google Sheet

**Full workflow — discard**

1. Trigger workflow through to approval screen
2. Click Discard

- Expected: nothing posted to Slack; nothing written to Notion or Sheets; workflow run logged with `approval_status: "discarded"`

**Full workflow — no Doc match fallback**

1. Trigger workflow where no Drive Doc matches the Calendar event title
2. Manually select a Doc via the file picker
3. Complete workflow through to approval and post

- Expected: workflow completes successfully using the manually selected Doc

**Full workflow — manual selection after ambiguous match**

1. Trigger workflow where multiple Drive Docs match the Calendar event title and tiebreakers do not resolve to a single match
2. Select the correct Doc from the surfaced candidates
3. Complete workflow through to approval and post

- Expected: workflow completes successfully using the selected Doc

### 8.4 Untestable Items and Flags

- **AI output consistency** — the AI summary and records are non-deterministic; tests can validate structure and taxonomy compliance but cannot assert exact output content; this is expected and acceptable
- **Google OAuth token expiry handling** — cannot be reliably triggered in a test environment; this path must be manually verified during staging
- **Gemini Notes Doc structure changes** — if Google changes the format of Gemini Notes documents (e.g., renames the `# 📖 Transcript` heading), the transcript extraction will silently fail or return incorrect content; the `TRANSCRIPT_NOT_FOUND` error test in 8.2 is the only safety net for this

---

## 9. Out of Scope

The following are explicitly excluded from this build. Any implementation that adds these features is over-building against this spec.

### Multi-user support

The app is single-user only. No user roles, no team accounts, no sharing of project configurations between users. If multi-user support is needed in the future, auth, data models, and RLS policies will require a full rearchitecture.

### Automatic triggering

The workflow is always manually initiated by the user clicking Trigger. No background jobs, no scheduled runs, no webhook listeners on Google Drive or Calendar events. Automation of the trigger itself is a future concern.

### Meeting recording or transcription

The app does not record meetings, process audio or video files, or generate transcripts. It depends entirely on Gemini Notes Docs already present in Google Drive. If a meeting does not have a Gemini Notes Doc, the app cannot process it beyond the manual file picker fallback.

### Email or calendar notifications

The app does not send any notifications — no email summaries, no Calendar invites, no reminders. Slack is the only outbound communication channel.

### Summary or record versioning

Once a workflow run is approved and posted, there is no mechanism to edit, retract, or re-post the summary or records from within the app. Corrections must be made manually in Slack and Notion/Sheets directly.

### Notion or Google Sheets database creation

The app does not create Notion databases or Google Sheets on behalf of the user. Both must be set up manually with the correct schema before a project can be configured.

### Support for other meeting platforms

The app is built exclusively around Google Meet and Gemini Notes. Zoom, Microsoft Teams, and other meeting platforms are not supported.

### Support for other destination types

The only supported structured data destinations are Notion and Google Sheets. Airtable, Jira, Asana, and other project management tools are out of scope.

### Mobile-first design

The app is designed for desktop browser use. Mobile viewports must not be broken but mobile is not a design target and no responsive design effort beyond basic usability is required.

### AI prompt customisation via UI

The AI prompt that drives summary generation and structured data extraction is defined in code. There is no UI for the user to edit or tune the prompt. Prompt changes require a code update and redeployment.

---

## 10. Open Questions

The following must be resolved before or during build. None of these are blockers to starting development, but each will require a decision before the affected feature can be completed.

---

**1. Slack Bot Token scope and installation**

The spec uses a `SLACK_BOT_TOKEN` stored as an environment variable. This requires a Slack app to be created and installed into the HostPapa Slack workspace with the following bot token scopes: `chat:write`, `chat:write.public` (to post to channels the bot hasn't joined). If the workspace has restrictions on third-party app installations, this will require approval from a Slack workspace admin.

*Decision needed:* Confirm that a Slack app can be created and installed into the workspace, and that `chat:write` and `chat:write.public` scopes are permissible.

*Decision:* Confirmed. A Slack app will be created and installed with the required scopes on the HostPapa Slack workspace.

---

**2. Notion API key and integration permissions**

The Notion API requires an internal integration to be created in the Notion workspace and explicitly connected to each database the app will write to. The `NOTION_API_KEY` is the integration's secret token. Each Notion database used as a project destination must have the integration added to it manually via the Notion UI.

*Decision needed:* Confirm that a Notion internal integration can be created in the workspace and that you have permission to connect it to the relevant databases.

*Decision:* Confirmed. A Notion internal integration can be created in the Notion workspace of my personal Notion account.

---

**3. Google OAuth consent screen verification**

The app uses Google OAuth to access Calendar, Drive, Docs, and Sheets. Because the app requests access to sensitive scopes (Drive, Docs), Google may require the OAuth consent screen to be verified before external users can authenticate. Since this is a single-user app, it can be kept in testing mode indefinitely — which bypasses verification but limits OAuth access to accounts explicitly added as test users in the Google Cloud Console.

*Decision needed:* Confirm the app will remain in testing mode with your Google account as the sole test user. This is the recommended approach for a single-user tool.

*Decision:* Confirmed. The app will remain in testing mode with my personal Google account as the sole test user.

---

**4. Google Cloud Project ownership**

The Google APIs (Calendar, Drive, Docs, Sheets) require a Google Cloud project with the relevant APIs enabled and OAuth credentials configured. This Cloud project must be created and maintained by you or someone with access to the Google Workspace.

*Decision needed:* Confirm who will create and own the Google Cloud project. If HostPapa has a managed Google Workspace, IT or admin involvement may be required to enable certain APIs or authorize the OAuth app.

*Decision:*  I will create the Google Cloud project using my peronal Google account and thus own the Google Cloud project.

---

**5. Gemini Notes Doc structure stability**

The transcript extraction logic depends on the `# 📖 Transcript` heading being present and consistently formatted in all Gemini Notes Docs. This heading is generated by Google and is not under your control. If Google changes the format of Gemini Notes documents, extraction will break.

*Decision needed:* Acknowledge this as an accepted risk and agree to monitor for breakage. No mitigation is possible beyond the `TRANSCRIPT_NOT_FOUND` error handling already specced.

*Decision:* Acknowledge that if Google Changes the format of Gemini Notes documents, then the extract will stop working.

---

**6. AI provider for initial build**

The spec supports both Anthropic Claude and Google Gemini via an environment variable. A decision on which provider to use first is needed before build begins so the correct API key is provisioned.

*Decision needed:* Select the initial AI provider — `anthropic` or `gemini` — for the first deployment.

*Decision:* The initial AI providers is `gemini` for the first deployment.

---

**7. Vercel deployment account**

The app is deployed to Vercel. A Vercel account is required, and the project must be linked to a GitHub repository.

*Decision needed:* Confirm whether a personal or organisational Vercel account will be used, and confirm that a GitHub repository will be created for the project.

*Decision:* Confirmed. A personal Vercel account will be used.

---

**8. Workflow state preservation on token expiry**

When the middleware detects a RefreshTokenError and redirects to sign-in, any in-progress workflow state (confirmed doc, selected project, generated summary) is lost. Section 4.3 requires state preservation "where possible" — this is acknowledged as currently unaddressed. Revisit when building the approval screen (Section 3.6); options include sessionStorage, URL params, or a short-lived server-side store.

*Status:* Deferred. 

## 11. Appendix

### 11.1 File and Folder Structure

The following is the expected file and folder structure for this project. Claude Code must generate this structure exactly before writing any code. Any deviations must be reviewed and approved before proceeding.

```
post-meeting-workflow-automation/
├── .env.example
├── .env.local                          # gitignored
├── .gitignore
├── CONTRIBUTING.md
├── README.md
├── SETUP.md
├── SPEC.md
├── next.config.ts
├── next-env.d.ts
├── tsconfig.json
├── eslint.config.mjs
├── package.json
├── package-lock.json
├── public/
└── src/
    ├── app/
    │   ├── layout.tsx                  # root layout
    │   ├── page.tsx                    # trigger screen (home)
    │   ├── confirm/
    │   │   └── page.tsx                # doc confirmation screen
    │   ├── project/
    │   │   └── page.tsx                # project selection screen
    │   ├── approve/
    │   │   └── page.tsx                # approval screen
    │   ├── projects/
    │   │   └── page.tsx                # project management screen
    │   ├── runs/
    │   │   └── page.tsx                # workflow run history screen
    │   └── api/
    │       ├── auth/
    │       │   └── [...nextauth]/
    │       │       └── route.ts        # NextAuth.js handler
    │       ├── workflow/
    │       │   ├── trigger/
    │       │   │   └── route.ts        # POST /api/workflow/trigger
    │       │   ├── match/
    │       │   │   └── route.ts        # POST /api/workflow/match
    │       │   ├── generate/
    │       │   │   └── route.ts        # POST /api/workflow/generate
    │       │   └── approve/
    │       │       └── route.ts        # POST /api/workflow/approve
    │       ├── projects/
    │       │   ├── route.ts            # GET, POST /api/projects
    │       │   └── [id]/
    │       │       └── route.ts        # PATCH, DELETE /api/projects/[id]
    │       └── runs/
    │           └── route.ts            # GET /api/runs
    ├── lib/
    │   ├── ai/
    │   │   └── generate.ts             # AI provider abstraction layer
    │   ├── google/
    │   │   ├── calendar.ts             # Google Calendar API client
    │   │   ├── drive.ts                # Google Drive API client
    │   │   ├── docs.ts                 # Google Docs API client
    │   │   └── sheets.ts               # Google Sheets API client
    │   ├── slack/
    │   │   └── post.ts                 # Slack API client
    │   ├── notion/
    │   │   └── write.ts                # Notion API client
    │   ├── supabase/
    │   │   └── client.ts               # Supabase client
    │   └── auth/
    │       └── config.ts               # NextAuth.js configuration
    └── types/
        └── index.ts                    # Project, WorkflowRun, StructuredDataRecord types
```