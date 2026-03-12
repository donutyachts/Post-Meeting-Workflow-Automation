# Post-Meeting Workflow Automation

A single-user Next.js web app that automates post-meeting admin work for a project manager.

## What It Does

After a meeting concludes, this tool:
1. Identifies the most recent Google Meet meeting from your Google Calendar where you are the organiser
2. Finds the corresponding Gemini Notes Google Doc in your Drive
3. Extracts the raw transcript and generates a structured bullet-point summary using AI
4. Presents the summary and extracted structured data (action items, decisions, changes, etc.) for your review and approval
5. On approval, posts the summary to the configured project Slack channel and writes structured data to a Notion database or Google Sheet

No summary or data is posted without your explicit approval.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** NextAuth.js v5 with Google OAuth 2.0
- **AI:** Anthropic Claude or Google Gemini (configurable via environment variable)
- **Deployment:** Vercel

## External Services

- Google Calendar API — fetches your most recent organiser-owned event
- Google Drive API — searches for matching Gemini Notes Docs
- Google Docs API — extracts the raw transcript
- Google Sheets API — writes structured data records (if configured per project)
- Slack API — posts approved summaries
- Notion API — writes structured data records (if configured per project)

## Project Structure

~~~
/app                  # Next.js App Router pages and layouts
/app/api              # API route handlers
/components           # React UI components
/lib
  /ai                 # AI provider abstraction layer (generate.ts)
  /google             # Google API clients (calendar, drive, docs, sheets)
  /slack              # Slack API client
  /notion             # Notion API client
  /supabase           # Supabase client and type definitions
/types                # Shared TypeScript types
~~~

## Setup

See [Environment Setup](SETUP.md) below for full local and production setup instructions.

## Key Decisions

- The AI works exclusively from the raw transcript section of the Gemini Notes Doc. The Gemini-generated summary is ignored.
- The AI prompt is defined in `lib/ai/generate.ts` and is not configurable via the UI. Prompt changes require a code update and redeployment.
- Transcripts are never persisted. They exist in memory only for the duration of a workflow run.
- Slack posting and Notion/Sheets writing are independent operations. Failure of one does not affect the other.
- The app is single-user only. Multi-user support requires a full rearchitecture.