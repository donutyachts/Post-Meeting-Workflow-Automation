# Spec Amendments

Amendments are identified during post-build reviews and appended after each build step. Each entry records what the spec currently says, what it should say, and how the code was resolved.

---

## Amendment 001

**Date:** 2026-03-10
**Section:** 5.2 — WorkflowRun
**Type:** Bug fix
**Status:** Applied

**What the spec currently says:**
`project_id` is defined as a non-nullable `string` with no stated FK deletion behaviour.

**What it should say:**
`project_id` should be nullable (`string | null`) with `ON DELETE SET NULL` behaviour on the foreign key, so that deleting a project preserves associated run history rather than either blocking the deletion or cascading deletes to runs. Section 3.9 states that deleting a project must not delete run history, which requires the FK to allow nullification.

**Resolution:**
- `supabase/migrations/0002_create_workflow_runs.sql`: removed `NOT NULL` from `project_id`, added `ON DELETE SET NULL` to the FK constraint.
- `src/types/workflow-run.ts`: changed `project_id: string` to `project_id: string | null`.

---

## Amendment 002

**Date:** 2026-03-10
**Section:** 5.2 — WorkflowRun
**Type:** Deviation (noted, not changed)
**Status:** Accepted as-is

**What the spec currently says:**
`meeting_date: string` — typed as a plain ISO 8601 date string with no SQL column type specified.

**What it should say:**
The spec should explicitly state the SQL column type. The migration uses `DATE` rather than `TEXT`. These are functionally compatible — Supabase returns `DATE` columns as ISO strings (`"2026-03-04"`) — but the implicit coercion is undocumented.

**Resolution:**
No code change made. The `DATE` column type is intentional for data integrity (rejects non-date values) and is compatible with the `string` TypeScript type. The spec should be updated to reflect the SQL column type choice explicitly.

---

## Amendment 003

**Date:** 2026-03-10
**Section:** 3.10 — Workflow Run History
**Type:** Omission
**Status:** Open — spec update required, UI implementation pending

**What the spec currently says:**
Section 3.10 describes the run history screen as displaying past runs in reverse chronological order but does not address what to display for the project field when the associated project has been deleted.

**What it should say:**
The run history screen must handle a null `project_id` gracefully. When `project_id` is null (project was deleted after the run was logged), the project column should display a fallback such as "Deleted project" rather than attempting a project name lookup that would fail or return nothing.

**Resolution:**
No code written yet. The `RunHistoryTable` component must check for `project_id === null` and render a "Deleted project" placeholder. This needs to be implemented when the run history screen is built.

---

## Amendment 004

**Date:** 2026-03-10
**Section:** 6 — API Contracts
**Type:** Bug fix
**Status:** Applied

**What the spec currently says:**
Section 6 states: "All routes require an authenticated session via NextAuth.js — unauthenticated requests return `401`." The spec does not distinguish between page routes and API routes in the auth failure behaviour.

**What it should say:**
The spec should clarify that the `401` requirement applies to API routes specifically. Page routes must redirect to sign-in (`302`) rather than return `401`, since a browser navigating to a page cannot act on a JSON error response. The two behaviours must be handled separately in middleware.

**Resolution:**
`src/middleware.ts` updated to branch on `req.nextUrl.pathname.startsWith("/api/")`: API routes return `NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })`; page routes redirect to `/api/auth/signin`.

---

## Amendment 005

**Date:** 2026-03-10
**Section:** 2 — Architecture → Auth
**Type:** Spec ambiguity
**Status:** Open — spec update required, no code change needed

**What the spec currently says:**
"Scopes required: `calendar.readonly`, `drive.readonly`, `docs.readonly`"

**What it should say:**
The scope shorthand `docs.readonly` does not correspond to a valid Google OAuth scope. The correct scope for the Google Docs API is `https://www.googleapis.com/auth/documents.readonly`. The spec should use the full scope URLs for all three scopes to avoid ambiguity:
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/documents.readonly`

**Resolution:**
`src/auth.ts` uses `documents.readonly` (the correct Google API scope). No code change needed. Spec should be updated to use full scope URLs.

---

## Amendment 006

**Date:** 2026-03-10
**Section:** 4.3 — Reliability
**Type:** Omission
**Status:** Open — implementation deferred to workflow UI build step

**What the spec currently says:**
"The app must handle Google OAuth token expiry gracefully — if a token is expired, the user is prompted to re-authenticate without losing their current workflow state where possible."

**What it should say:**
The spec should define what "workflow state" means in this context and how it is preserved — for example, whether the confirmed doc ID, selected project, and generated summary are held in `sessionStorage`, URL parameters, or a server-side temporary store, and restored after the OAuth redirect completes.

**Resolution:**
No mechanism exists yet. Silent token refresh in the `jwt` callback handles expiry in most cases without any redirect. The re-authentication redirect path (when refresh fails) currently loses all in-progress workflow state. State preservation must be addressed when the workflow screens are built.

---

## Amendment 007

**Date:** 2026-03-10
**Section:** 3.5.1 — AI Prompt / 5 — Data Models
**Type:** Omission
**Status:** Open — spec update required, no code change needed

**What the spec currently says:**
Section 7 names the return type of `generateSummary` as `Promise<GenerateResult>` but never defines the shape of `GenerateResult`. No definition appears in Section 5 (Data Models) or anywhere else in the spec.

**What it should say:**
`GenerateResult` should be defined explicitly in Section 5 alongside the other data types:
```typescript
type GenerateResult = {
  summary: string;      // formatted summary string per Section 3.5.1
  records: AiRecord[];  // records without meeting_title / meeting_date
}

type AiRecord = {
  category: RecordCategory;
  description: string;
  owner: string | null;
  due_date: string | null;
}
```
`AiRecord` is distinct from `StructuredDataRecord` because the AI does not return `meeting_title` or `meeting_date` — those fields are added by the `/api/workflow/generate` route handler before the records are returned to the client.

**Resolution:**
`GenerateResult` and `AiRecord` are defined in `src/lib/ai/generate.ts` with shapes inferred from the Section 6 `/api/workflow/generate` response contract. No code change needed.

---

## Amendment 008

**Date:** 2026-03-10
**Section:** 3.5.1 — AI Prompt
**Type:** Omission
**Status:** Applied

**What the spec currently says:**
Section 3.5.1 defines the AI response shape and the category taxonomy but does not specify whether the application should validate that returned category values are members of the known taxonomy before using them downstream.

**What it should say:**
The spec should require that `category` values in the AI response are validated against the taxonomy (`Conclusions`, `Action items`, `Changes`, `Decisions`, `Things to know`, `Risks`, `Problems`) before the response is accepted. Invalid values must be rejected with a clear error identifying which record failed, rather than propagating silently to Notion or Sheets where they would cause a write failure with a less actionable error.

**Resolution:**
`parseAndValidate` in `src/lib/ai/generate.ts` now iterates `records`, checks each `category` against `RECORD_CATEGORIES`, and throws with the record index and invalid value if validation fails.

---

## Amendment 009

**Date:** 2026-03-10
**Section:** 3.4 — Transcript Extraction
**Type:** Omission
**Status:** Applied

**What the spec currently says:**
"The boundary between the Gemini-generated content and the raw transcript is identified by locating the `# 📖 Transcript` heading in the document."

The spec does not specify that the match must be constrained to heading-styled paragraphs. The `#` prefix implies a Markdown H1, but gives no guidance on how this maps to Google Docs paragraph styles.

**What it should say:**
The transcript boundary detection must match a paragraph whose `paragraphStyle.namedStyleType` is `HEADING_1` or `HEADING_2` AND whose text content includes `📖 Transcript`. Matching on text content alone would incorrectly trigger on any body paragraph that happened to contain that string (e.g. a quoted reference to the heading later in the document).

**Resolution:**
`src/lib/google/docs.ts` checks both `namedStyleType === "HEADING_1" || "HEADING_2"` and `text.includes("📖 Transcript")` before setting the transcript boundary. Both conditions must be true.

---

## Amendment 010

**Date:** 2026-03-10
**Section:** 3.2 — Gemini Notes Doc Matching / 6 — POST /api/workflow/trigger
**Type:** Spec ambiguity
**Status:** Open — spec update required, no code change needed

**What the spec currently says:**
Section 3.2 describes the date tiebreaker as: "Parse the date from the top of the Google Doc and match against the Calendar event date." The Section 6 trigger response shape includes a `doc_date` field on each match candidate.

The spec does not clarify what `doc_date` represents in the trigger response — whether it is the Drive file's `createdTime` or the date parsed from the document's content.

**What it should say:**
The spec should distinguish between two separate dates:
1. `doc_date` in the trigger response — populated from Drive's `createdTime` field; available without fetching the document content and used as a fast initial filter.
2. The date parsed from the top of the document body — used by the `/api/workflow/match` tiebreaker logic, which must fetch Doc content to obtain it.

These are not the same value. A Gemini Notes Doc's `createdTime` is the moment the file was created in Drive, which matches the meeting date in practice but is not guaranteed to.

**Resolution:**
`src/lib/google/drive.ts` populates `doc_date` from `createdTime`. The `/api/workflow/match` route (not yet built) is responsible for fetching document content and parsing the in-document date for tiebreaking.

---

## Amendment 011

**Date:** 2026-03-10
**Section:** 6 — POST /api/workflow/generate
**Type:** Omission
**Status:** Applied — additions made, spec update required

**What the spec currently says:**
The generate request body is `{ doc_id, meeting_title, meeting_date, project_id }`. The generate response is `{ summary, records }` where records contain only `{ category, description, owner, due_date }`.

**What it should say:**
Three additions are required by the implementation:

1. `meeting_duration_minutes` must be added to the request body. The `workflow_runs` table requires this field as `NOT NULL`. It is available on the client from the trigger phase but the spec never specifies when or how it is forwarded to the generate step.

2. `run_id` must be added to the response. The approve and discard routes reference a `run_id` that must have been created before approval. The generate route creates the run record and must return its ID. Without this, the approve/discard routes have no run to update.

3. Records in the response must include `meeting_title` and `meeting_date`. The approve route passes records directly to Notion and Google Sheets, which require these fields (Section 5.7, 5.8). The spec's generate response shows AI-only record fields, but the full `StructuredDataRecord` shape is what the approve route needs.

**Resolution:**
`src/app/api/workflow/generate/route.ts` accepts `meeting_duration_minutes` in the request, creates the `workflow_runs` record, enriches records with `meeting_title`/`meeting_date`, and returns `{ run_id, summary, records }`.

---

## Amendment 012

**Date:** 2026-03-10
**Section:** 6 — POST /api/workflow/approve / 3.6 — Approval UI
**Type:** Omission
**Status:** Applied — discard route created, spec update required

**What the spec currently says:**
Section 3.6 states: "Discard cancels the workflow run without posting or writing anything; the run is logged as discarded." Section 6 defines no discard API endpoint. The only workflow route defined is `POST /api/workflow/approve`.

**What it should say:**
A dedicated `POST /api/workflow/discard` route must be defined in Section 6 with the following contract:
- Request: `{ run_id: string }`
- Response 200: `{ discarded: true }`
- Error 400: `VALIDATION_ERROR` if `run_id` is missing
- Error 404: `NOT_FOUND` if the run does not exist

**Resolution:**
`src/app/api/workflow/discard/route.ts` created. Sets `approval_status: "discarded"`, `slack_status: "skipped"`, `destination_status: "skipped"` on the run record without calling Slack, Notion, or Sheets.

---

## Amendment 013

**Date:** 2026-03-10
**Section:** 6 — POST /api/workflow/approve
**Type:** Spec ambiguity
**Status:** Open — spec decision required, implementation chose 207

**What the spec currently says:**
Section 6 defines both a `207` partial-success response (when one of Slack or destination fails) and standalone `502` error states for `SLACK_API_ERROR`, `NOTION_API_ERROR`, and `SHEETS_API_ERROR`. This is contradictory: Section 4.3 requires both operations to be attempted independently regardless of individual failures, but standalone 502 states imply a single-operation failure can terminate the route.

**What it should say:**
The spec should remove the standalone `502` error states from the approve route and replace them with a clarification that all delivery failures are reported via the `207` partial-success response shape. The `502` status code is inappropriate for an endpoint that must always attempt both operations.

**Resolution:**
The implementation always attempts both Slack and destination independently and returns `207` if either fails, `200` if both succeed. The `502` error states defined in Section 6 are never produced by this route.

---

## Amendment 014

**Date:** 2026-03-10
**Section:** 6 — POST /api/workflow/approve
**Type:** Bug fix
**Status:** Applied

**What the spec currently says:**
Section 6: "422 — Slack thread link malformed or message not found: `{ error: 'INVALID_THREAD_LINK' }`". The spec does not specify where thread_ts extraction and validation occur.

**What it should say:**
The spec should clarify that `slack_thread_ts` in the approve request is the already-extracted timestamp value (not the raw Slack message URL), and that the approve route must validate it matches the format `\d+\.\d+` before any posting begins. A malformed value must return 422 immediately without calling Slack or the destination.

**Resolution:**
`src/app/api/workflow/approve/route.ts` validates `slack_thread_ts` against `/^\d+\.\d+$/` before the Slack call. Invalid values return 422 with `INVALID_THREAD_LINK` and short-circuit before any posting.

---

## Amendment 015

**Date:** 2026-03-10
**Section:** 6 — POST /api/workflow/match
**Type:** Omission
**Status:** Open — spec update required, implementation inferred from Section 3.2

**What the spec currently says:**
Section 2 lists `/api/workflow/match` as a backend component but Section 6 provides no request/response contract for it.

**What it should say:**
Section 6 must define the full contract for `POST /api/workflow/match`:
- Request: `{ event: { date, duration_minutes }, candidates: DriveMatch[] }`
- Response: `{ resolved: DriveMatch | null, ambiguous: DriveMatch[] }`
- Error 400: `VALIDATION_ERROR` if required fields are missing

Additionally, the spec should clarify the two-step tiebreaker: date matching uses `doc_date` from Drive candidates (fast, no Doc fetch required); duration matching requires fetching Doc content and is the responsibility of this route, not the trigger route.

**Resolution:**
`src/app/api/workflow/match/route.ts` implements date-based tiebreaking only. Duration tiebreaking is not implemented — it requires fetching Doc content and is noted inline as a gap.

---

## Amendment 016

**Date:** 2026-03-10
**Section:** 6 — GET /api/runs
**Type:** Deviation (noted, not changed)
**Status:** Accepted as-is

**What the spec currently says:**
The `GET /api/runs` response shows a subset of `WorkflowRun` fields: `id`, `meeting_title`, `meeting_date`, `project_id`, `ai_provider`, `approval_status`, `slack_status`, `destination_status`, `created_at`.

**What it should say:**
The spec should either confirm this is the complete response shape (requiring a `select()` with named columns) or acknowledge that the full row is returned. The current implementation uses `select("*")`, which also returns `meeting_duration_minutes`, `gemini_doc_id`, and `slack_thread_ts`.

**Resolution:**
No code change. The extra fields are harmless and may be useful to the run history UI. The spec should be updated to reflect the actual response shape.

---

## Amendment 017

**Date:** 2026-03-10
**Section:** 6 — PATCH /api/projects/[id]
**Type:** Omission
**Status:** Open — spec update required, implementation gap noted

**What the spec currently says:**
"Request: any subset of `name`, `slack_channel_id`, `destination_type`, `destination_id`." The spec does not state whether an empty body is valid.

**What it should say:**
The spec should explicitly state that an empty request body (no fields provided) is invalid and must return `400 VALIDATION_ERROR`. Sending an empty update is a no-op that fires a database write and updates `updated_at` without changing any meaningful data.

**Resolution:**
Not yet applied. The PATCH handler should check that at least one recognised field is present in the body before calling `updateProject`.

---

## Amendment 018

**Date:** 2026-03-10
**Section:** 5.1 — Project / 3.9 — Project Management / 6 — GET, POST, PATCH /api/projects
**Type:** Addition
**Status:** Applied — code updated, spec update required

**What the spec currently says:**
Section 5.1 defines the `Project` type with four user-configurable fields: `name`, `slack_channel_id`, `destination_type`, `destination_id`. Section 3.9 lists the same four fields as the contents of a project configuration. Section 6's `GET /api/projects` response, `POST /api/projects` request body, and `PATCH /api/projects/[id]` patchable field list all reflect only these four fields. The approval screen was intended to display "the target Slack channel name and destination (Notion DB or Sheet name)" but the spec provided no data source for these human-readable names — the Project model stored only IDs.

**What it should say:**
The `Project` type must include two additional required string fields:
- `slack_channel_name: string` — human-readable Slack channel name entered by the user, stored without `#` prefix (e.g. `"brand-unification"`). Displayed on the approval screen as `#brand-unification`.
- `destination_name: string` — human-readable name for the Notion database or Google Sheet (e.g. `"Brand Unification DB"`). Displayed on the approval screen as-is.

Both fields must be required in the `POST /api/projects` request body, included in the `GET /api/projects` response, and accepted as patchable fields in `PATCH /api/projects/[id]`. The Supabase `projects` table must have corresponding columns.

**Resolution:**
- `src/types/project.ts`: added `slack_channel_name: string` and `destination_name: string` to `Project`. `CreateProjectInput` and `UpdateProjectInput` pick them up automatically via `Omit` and `Partial`.
- `src/app/api/projects/route.ts`: POST validation now requires both new fields; both are passed to `createProject()`.
- `src/app/api/projects/[id]/route.ts`: no code change — PATCH passes the body through `UpdateProjectInput` which now includes both fields.
- `src/app/projects/page.tsx`: form updated with `slack_channel_name` and `destination_name` inputs; read-only card updated to display both.
- `src/app/workflow/approve/page.tsx`: approval screen now renders `#project.slack_channel_name` and `project.destination_name` without any API call.

---

## Amendment 019

**Date:** 2026-03-10
**Section:** 3.6 — Approval UI
**Type:** Bug fix
**Status:** Applied

**What the spec currently says:**
"The app presents the generated summary and structured data records **side by side** on the approval screen."

**What was built:**
The initial implementation rendered the summary textarea above the structured records table in a single-column stacked layout. The spec's "side by side" requirement was not met.

**Resolution:**
`src/app/workflow/approve/page.tsx`: the summary and records sections are now wrapped in a `display: grid; grid-template-columns: 1fr 1fr` container. Summary occupies the left column; records occupy the right column. An `approve-cols` CSS class with a `@media (max-width: 720px)` rule in `globals.css` collapses the grid to a single column on narrow viewports per Section 4.5's "must not be broken on mobile" requirement.

---

## Amendment 020

**Date:** 2026-03-10
**Section:** 4.5 — Usability
**Type:** Bug fix
**Status:** Applied

**What the spec currently says:**
"All destructive or irreversible actions (**Approve & Post**, Discard) must require a single explicit confirmation before executing."

**What was built:**
`handleDiscard` called `confirm()` before proceeding. `handleApprove` proceeded immediately on button click with no confirmation dialog — the spec's requirement for Approve & Post was not implemented.

**Resolution:**
`src/app/workflow/approve/page.tsx`: `handleApprove` now calls `confirm("Post summary to Slack and write records to the destination? This cannot be undone.")` before any validation or API call. If the user cancels, the function returns immediately without side effects.

---

## Amendment 021

**Date:** 2026-03-10
**Section:** 3.7 — Slack Posting / 3.8 — Notion / Google Sheets Writing
**Type:** Omission
**Status:** Applied — additions made, spec update required

**What the spec currently says:**
Section 3.7: "If the Slack API call fails, the app displays an error and does not mark the run as successfully delivered; the user can retry."
Section 3.8: "If the write call fails, the app displays an error and does not mark the run as successfully delivered; the user can retry independently of the Slack post (i.e., if Slack succeeded but Sheets failed, only the Sheets write is retried). Retry is manual — the user clicks a retry button on the error screen."

The spec defines no API mechanism for retrying a single delivery operation independently. Section 6's `POST /api/workflow/approve` contract shows only the initial approval request shape with no mention of a retry mode.

**What it should say:**
Three additions are required:

1. `POST /api/workflow/approve` must accept an optional `retry_only?: "slack" | "destination"` field in the request body. When present, only the named operation is attempted; the other is skipped and its stored status in Supabase is not modified.

2. A partial delivery status update function is needed that writes only the fields relevant to the retried operation. The existing `updateWorkflowRunDelivery` requires all four delivery fields and would incorrectly overwrite the already-settled status of the non-retried operation.

3. The post-approval result screen must show a per-operation retry button when that operation's status is `"failed"`, and must not show a retry button when the status is `"success"` or `"skipped"`. A 207 partial-success response must surface the failed operation's retry button while the succeeded operation displays as done.

**Resolution:**
- `src/lib/supabase/queries/workflow-runs.ts`: added `patchWorkflowRunDelivery(id, updates)` which accepts a partial set of delivery status fields and calls Supabase `.update()` with only those fields, leaving the others unchanged.
- `src/app/api/workflow/approve/route.ts`: added `retry_only?: "slack" | "destination"` to `ApproveRequest`. When `retry_only === "slack"`: only the Slack post runs; `patchWorkflowRunDelivery` is called with only `slack_status` and `slack_thread_ts`. When `retry_only === "destination"`: only the destination write runs; `patchWorkflowRunDelivery` is called with only `destination_status`. The normal approval path (both operations) is unchanged.
- `src/app/workflow/approve/page.tsx`: the done screen now renders a per-operation row with a retry button when `status === "failed"`. `handleRetrySlack` and `handleRetryDestination` each call the approve route with the appropriate `retry_only` flag and merge only the returned status fields back into `deliveryResult` state, leaving the other operation's status untouched in local state. `resolvedSlackThreadTs` is saved to component state during initial approval so retries can reuse the same `thread_ts`.

---

## Amendment 022

**Date:** 2026-03-10
**Section:** 3.2 — Gemini Notes Doc Matching
**Type:** Omission
**Status:** Open — frontend implementation gap, spec clarification required

**What the spec currently says:**
"If multiple matches are found, the app applies tiebreakers in this order: (1) Parse the date from the top of the Google Doc and match against the Calendar event date; (2) Parse the meeting duration from the transcript and match against the Calendar event duration; (3) If ambiguity remains, surface all remaining candidates for manual selection."

**What was built:**
The confirm screen (`src/app/workflow/confirm/page.tsx`) reads the raw candidate list from sessionStorage (populated by the trigger route) and displays all candidates unconditionally as a radio-button table. The `POST /api/workflow/match` route — which implements the date tiebreaker — is never called from the frontend. The tiebreaker logic exists in the route but is dead code from the client's perspective.

**What it should say:**
The confirm screen must call `POST /api/workflow/match` when the trigger response contains more than one candidate, passing the event date/duration and the candidate list. If the match route returns a single `resolved` doc, that doc should be pre-selected for the user to confirm. Only if `resolved` is null (ambiguity remains after tiebreaking) should the full candidate list be presented for manual selection.

**Resolution:**
Not yet applied. The confirm screen must be updated to call `/api/workflow/match` before rendering the doc selection UI when `matches.length > 1`.

---

## Amendment 023

**Date:** 2026-03-10
**Section:** 8.2 — Integration Tests / AI provider — summary generation
**Type:** Spec clarification
**Status:** Applied — spec updated by author; existing test verified compliant

**What the spec previously said:**
Section 8.2 described the AI provider test with no guidance on whether `vi.resetModules()` was needed to switch providers between test runs.

**What it now says:**
"If `generate.ts` initialises the provider client at module load time, the integration test must call `vi.resetModules()` and dynamically import `generate.ts` after stubbing `AI_PROVIDER`, matching the pattern used in the Slack and Notion client tests."

**Resolution:**
`generate.ts` reads `process.env.AI_PROVIDER` inside the function body at call time (not at module load), so the conditional in the new clause is not met. `vi.stubEnv("AI_PROVIDER", provider)` correctly controls which branch executes. The provider SDK clients (`anthropic.ts`, `gemini.ts`) are module-level singletons but each uses its own API key — both valid in the test environment — and neither key changes between tests. No code change was required. The test comment was updated to document this reasoning explicitly.

---

## Amendment 024

**Date:** 2026-03-10
**Section:** 8.2 — Integration Tests / Slack posting
**Type:** Test gap
**Status:** Applied

**What the spec says:**
"Input: malformed `slack_thread_ts` — Expected: `INVALID_THREAD_LINK` error returned; no message posted."

**What was built:**
`slack-posting.test.ts` tested the malformed case by asserting the regex pattern directly, without making any HTTP request to the route. The actual 422 response from `POST /api/workflow/approve` was never exercised.

**Resolution:**
`tests/integration/approve-route-thread-validation.test.ts` created. Imports `POST` from the route handler directly, constructs `NextRequest` instances with malformed `slack_thread_ts` values, and asserts HTTP 422 with `error: "INVALID_THREAD_LINK"`. Auth and Supabase lookups are mocked via `vi.mock()` (hoisted); no real Slack or Notion credentials are used since the 422 guard fires before any delivery call. Five cases are covered: full Slack URL, bare integer without decimal, non-numeric string, valid `digits.digits` format (must not be 422), and absent `slack_thread_ts` (must not be 422).

---

## Amendment 025

**Date:** 2026-03-10
**Section:** 8.2 — Integration Tests / Notion writing
**Type:** Test bug + test gap
**Status:** Applied

**What the spec says:**
"Expected: correct number of rows created in test Notion database; field values match input exactly."

**What was built:**
`notion-writing.test.ts` had two problems:
1. The readback checked `props["Description"]` with type `rich_text`, but `appendRecordToNotion` writes the description to the `Name` property (type `title`). The `Description` property does not exist in the database schema; this assertion would always throw "Expected Description to be rich_text at index 0."
2. Only `description` (via wrong property) and `category` were verified on readback. `owner`, `due_date`, `meeting_title`, and `meeting_date` were written but never read back.

**Resolution:**
`notion-writing.test.ts` updated:
- Description: now reads `props["Name"]` with `type === "title"`, matching how `appendRecordToNotion` writes it.
- Owner: reads `props["Owner"]` as `rich_text`; asserts `""` when `expected.owner === null` (Notion returns empty `rich_text: []` for omitted properties).
- Due Date: reads `props["Due Date"]` as `date`; asserts `date.start` equals the expected value when present, and `date === null` when `expected.due_date === null` (Notion returns `date: null` for omitted date properties).
- Meeting: reads `props["Meeting"]` as `rich_text`; asserts `meeting_title`.
- Meeting Date: reads `props["Meeting Date"]` as `date`; asserts `date.start` equals `meeting_date`.

---

## Amendment 026

**Date:** 2026-03-10
**Section:** 8.2 — Integration Tests / Partial approval failure
**Type:** Test gap
**Status:** Applied

**What the spec says:**
"Expected: Slack post succeeds; destination write fails; response status is 207; `slack_status: "success"`, `destination_status: "failed"`."

**What was built:**
`partial-failure.test.ts` tested Slack and Notion in isolation at the library level only. The 207 HTTP response and combined `{ slack_status, destination_status }` payload from `POST /api/workflow/approve` were never asserted. A comment in the test incorrectly stated this was covered by "the E2E partial failure scenario" — no such E2E spec exists.

**Resolution:**
`tests/integration/approve-route-partial-failure.test.ts` created. Uses `vi.stubEnv("NOTION_API_KEY", "invalid") + vi.resetModules() + vi.doMock()` to ensure the Notion client re-initialises with the bad key. Auth, Supabase run-lookup, project-lookup, and run-persistence are mocked; `@/lib/slack/client` is left unmocked so a real Slack post to `TEST_SLACK_CHANNEL_ID` executes. Asserts `response.status === 207`, `slack_status === "success"`, `destination_status === "failed"`, and `destination_error` matching `/NOTION_API_ERROR/`. The misleading comment in `partial-failure.test.ts` was updated to reference the new file.

---

## Amendment 027

**Date:** 2026-03-10
**Section:** 8.3 — End-to-End Tests
**Type:** Test gap
**Status:** Applied

**What the spec implies:**
E2E tests must reliably locate UI elements. All five E2E specs used `data-testid` as the primary locator strategy, with text-content or attribute-name strings as fallbacks.

**What was built:**
No `data-testid` attributes were present on the built React components. Every `data-testid` locator in the E2E specs silently fell through to its fallback selector. The tests were effectively running on imprecise fallbacks and would break if button text or input names changed.

**Resolution:**
`data-testid` attributes added to all targeted elements across three components:
- `src/app/workflow/confirm/page.tsx`: `meeting-title-input`, `meeting-date-input`, `doc-candidate` (candidate `<tr>`), `manual-doc-input`, `project-select`, `generate-btn`.
- `src/app/workflow/approve/page.tsx`: `summary-textarea`, `thread-input`, `approve-btn`, `discard-btn`, `slack-status` and `destination-status` (via `testId` prop on `DeliveryBadge`).
- `src/app/runs/page.tsx`: `run-row` (each run `<tr>`).

All five E2E specs updated to use bare `data-testid` selectors only; all fallback selectors removed.

---

## Amendment 028

**Date:** 2026-03-10
**Section:** 8.3 — End-to-End Tests / Full workflow — manual selection after ambiguous match
**Type:** Test bug
**Status:** Applied

**What the spec says:**
"The confirm page shows a radio-button table with more than one candidate."

**What was built:**
`workflow-ambiguous-match.spec.ts` contained `await expect(candidates).toHaveCount(2)` — hardcoded to exactly two candidates. Any fixture that produced three or more candidates would cause this assertion to fail, even though the test's intent was only to verify that multiple candidates are present.

**Resolution:**
The `toHaveCount(2)` assertion and its associated comments were removed. The immediately following `expect(candidateCount).toBeGreaterThan(1)` is the correct form and is retained as the sole count assertion.

---

## Amendment 029

**Date:** 2026-03-10
**Section:** 8.2 — Integration Tests / Partial approval failure
**Type:** Test bug
**Status:** Applied

**What was built:**
`partial-failure.test.ts` contained a comment stating the 207 HTTP response was "exercised by the E2E partial failure scenario." No E2E partial failure spec exists, and Section 8.3 does not list partial failure as a required E2E scenario. The comment was factually wrong and would mislead anyone investigating test coverage for the 207 path.

**Resolution:**
Comment updated to reference `approve-route-partial-failure.test.ts`, which is where the 207 response is now actually tested.
