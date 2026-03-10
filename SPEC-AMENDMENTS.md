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
