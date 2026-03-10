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
