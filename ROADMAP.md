# Post-Meeting Workflow Automation — Product Roadmap

*Maintained alongside [SPEC.md](./SPEC.md). Each item links to the relevant spec section where applicable. Items move from Next → Now only when all open questions are resolved and the spec is updated.*

---

## Now

### Approval Screen Overhaul
**Problem:** The approval screen is difficult to use for any meeting with a moderately long summary or more than a few structured data records. Four specific issues compound: the structured data description field is too narrow to read or edit comfortably; the structured data panel requires horizontal scrolling; the summary textarea is too short for long summaries and requires vertical scrolling; and the summary renders as plain text rather than a Slack-formatted preview, making it hard to verify before posting.

**Success criteria:**
- Description fields in the structured data table are wide enough to display and edit a full sentence without horizontal scrolling
- The structured data panel fits within the viewport without horizontal overflow on a standard desktop browser (1280px+)
- The summary textarea expands to accommodate long summaries without requiring vertical scroll within the field
- The summary panel renders a live Slack-formatted preview (bold section labels, bullet points) that updates as the user edits

**Spec reference:** Section 3.6

**Open questions:** None. This is a UI-only change with no API or data model impact.

---

## Next

### Pre-Meeting Prep Workflow
**Problem:** Before every meeting, the PM manually reviews past meeting notes, checks for open and overdue action items, and scans the project Slack channel for recent activity — then writes an agenda from scratch. This prep is time-consuming, inconsistent across meetings, and easy to skip under time pressure.

**Success criteria:**
- Given a selected upcoming Calendar event and project, the app generates a private briefing (for the PM's eyes only) and a draft agenda (for posting to the Slack channel)
- The briefing surfaces: open and overdue action items from Notion/Sheets, decisions from past meetings relevant to today's agenda, and a summary of recent Slack channel activity
- The draft agenda is reviewed and edited in an approval UI consistent with the post-meeting pattern before posting
- The PM can approve the agenda post to Slack, discard it, or save the briefing without posting

**Spec reference:** This feature extends the architecture in Section 2 and requires a new spec section before building. The existing AI provider abstraction layer (Section 3.5.1), Slack posting pattern (Section 3.7), and approval UI pattern (Section 3.6) all apply.

**Open questions:**
1. How is "upcoming" defined — next event on the calendar where the user is organizer, or user-selected from a list?
2. How far back should past meeting summaries be pulled — all runs for the project, or a configurable window?
3. "Recent Slack activity" scope: how many messages, over what time window?
4. Does the briefing live only in the app session (like the current transcript), or is it persisted in Supabase for later reference?
5. Agenda format: free-form text the AI drafts, or a structured template with sections (e.g., Review action items, Discussion topics, Decisions needed)?
6. Should the briefing and agenda be generated in a single AI call or two separate calls?
7. New Slack scope required: `channels:history` or `groups:history` to read channel messages. This requires updating the Slack app configuration and may require workspace admin approval — confirm before designing the feature.

---

### Rich Structured Data Records
**Problem:** Structured data records written to Notion and Google Sheets contain only a description, stripped of the context that makes them actionable. A Problem record, for example, should capture not just what the problem is but why it matters, its impact, and the proposed solution. Without this context, records in Notion and Sheets are reference items rather than useful artifacts.

**Success criteria:**
- Each structured data record is written with category-specific contextual fields, not just a description
- For Notion: the page body of each record is populated with structured content following a per-category template
- For Google Sheets: additional columns are appended per record to capture the same contextual fields
- The AI infers contextual field values from the transcript in the same call that generates the summary and records — no additional user input required at generation time
- The user can review and edit contextual fields in the approval UI before posting
- Records where context cannot be inferred from the transcript have those fields left blank rather than hallucinated

**Spec reference:** Extends Sections 3.5 (AI generation), 3.6 (approval UI), 3.8 (Notion/Sheets writing), 5.3 (StructuredDataRecord), 5.7 (Notion schema), and 5.8 (Sheets schema). Requires updates to the AI prompt in Section 3.5.1.

**Open questions:**
1. What are the contextual fields for each category? Known so far: Problem (what it is, why it's a problem, impact, solution). Need templates for: Conclusions, Action items, Changes, Decisions, Things to know, Risks.
2. For Google Sheets: should contextual fields be additional columns appended after the existing schema, or should the schema be redesigned entirely?
3. For Notion: the existing schema uses row properties only. Populating the page body requires a different Notion API call (`append_block_children`) in addition to the existing `create_page` call — confirm this is acceptable complexity.
4. Should contextual fields be editable per-record in the approval UI, or is the AI-generated content treated as final unless the user edits the description?
5. If a contextual field cannot be inferred from the transcript, should the field be omitted entirely or left as a visible blank for the user to fill in manually?

---

## Later

### Project Health Sentinel
**Problem:** Problems in a project — overdue action items, unresolved questions, team friction, recurring risks — often surface gradually across meeting notes, Slack messages, and task records. Today the PM has to synthesize this manually. By the time a pattern is visible, it's often already a problem.

**Success criteria:**
- On demand, the app produces a digest for a selected project that identifies: overdue or stalled action items, unresolved decisions or open questions from past meetings, and qualitative signals from Slack channel messages (unanswered questions, negative sentiment, recurring themes)
- The digest is displayed in a dedicated screen in the app
- No findings are posted to Slack automatically — the PM decides what, if anything, to share

**Spec reference:** Requires a new spec section. Extends the data access patterns established by the pre-meeting prep workflow. Do not spec or build until pre-meeting prep is shipped.

**Open questions:**
1. Slack read access: the sentinel needs `channels:history` or `groups:history` to read all channel messages, not just those posted by the bot. This is a meaningful scope escalation — confirm feasibility and workspace admin requirements before designing.
2. What time window does the sentinel analyse — since last meeting, last 30 days, since project creation?
3. How does the app distinguish a bot-posted summary from a human message in the channel when reading history?
4. What is the AI's instruction set for qualitative signal detection — what counts as "friction", "unanswered question", or "negative sentiment" in this context? This needs a defined prompt taxonomy before the feature can be specced precisely.
5. Should the sentinel store its findings in Supabase, or are they ephemeral like the current transcript?
6. How does the sentinel handle false positives — findings the PM judges as non-issues? Is there a dismiss or snooze mechanism?

---

## Done

*Nothing shipped yet beyond initial build.*

---

## Dropped

*Nothing dropped yet.*
