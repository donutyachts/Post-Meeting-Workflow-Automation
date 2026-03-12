# Environment Setup

Full instructions for running this project locally and deploying to production.

---

## Prerequisites

- Node.js 18 or higher
- A Google account with Google Meet and Gemini Notes enabled
- A Supabase account
- A Vercel account
- A Slack workspace where you can create apps
- A Notion account (if using Notion as a destination)

---

## 1. Google Cloud Project

The app requires a Google Cloud project to access Calendar, Drive, Docs, and Sheets APIs.

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com) and create a new project
2. Enable the following APIs:
  - Google Calendar API
  - Google Drive API
  - Google Docs API
  - Google Sheets API
3. Go to APIs & Services → OAuth consent screen
  - Set User Type to External
  - Fill in the required app name and contact fields
  - Add the following scopes:
    - [https://www.googleapis.com/auth/calendar.readonly](https://www.googleapis.com/auth/calendar.readonly)
    - [https://www.googleapis.com/auth/drive.readonly](https://www.googleapis.com/auth/drive.readonly)
    - [https://www.googleapis.com/auth/documents.readonly](https://www.googleapis.com/auth/documents.readonly)
    - [https://www.googleapis.com/auth/spreadsheets](https://www.googleapis.com/auth/spreadsheets)
  - Add your Google account as a test user
  - Leave the app in Testing mode — do not submit for verification
4. Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
  - Application type: Web application
  - Authorised redirect URIs:
    - [http://localhost:3000/api/auth/callback/google](http://localhost:3000/api/auth/callback/google) (local)
    - [https://post-meeting-workflow-automation.vercel.app/api/auth/callback/google](https://post-meeting-workflow-automation.vercel.app/api/auth/callback/google) (production)
5. Copy the Client ID and Client Secret — these become GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

---

## 2. Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. In the Supabase SQL editor, run the following to create the required tables:

sql
-- Projects table
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slack_channel_id text not null,
  destination_type text not null check (destination_type in ('notion', 'sheets')),
  destination_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workflow runs table
create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  meeting_title text not null,
  meeting_date date not null,
  meeting_duration_minutes integer not null,
  gemini_doc_id text not null,
  project_id uuid references projects(id),
  ai_provider text not null check (ai_provider in ('anthropic', 'gemini')),
  approval_status text not null check (approval_status in ('approved', 'discarded')),
  slack_status text not null check (slack_status in ('success', 'failed', 'skipped')),
  destination_status text not null check (destination_status in ('success', 'failed', 'skipped')),
  slack_thread_ts text,
  created_at timestamptz default now()
);

-- Enable row-level security
alter table projects enable row level security;
alter table workflow_runs enable row level security;

-- RLS policies (single-user: allow all operations for authenticated users)
create policy "Allow all for authenticated users" on projects
  for all using (auth.role() = 'authenticated');

create policy "Allow all for authenticated users" on workflow_runs
  for all using (auth.role() = 'authenticated');


1. Copy the Project URL, Anon Key, and Service Role Key from Project Settings → API

---

## 3. Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click Create New App → From scratch
2. Name the app and select your workspace
3. Go to OAuth & Permissions → Bot Token Scopes and add:
  - chat:write
  - chat:write.public
4. Click Install to Workspace and authorise
5. Copy the Bot User OAuth Token — this becomes SLACK_BOT_TOKEN

---

## 4. Notion Integration

Skip this section if you are not using Notion as a destination.

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) and click New integration
2. Name the integration and select your workspace
3. Set capabilities to: Insert content, Read content
4. Copy the Internal Integration Secret — this becomes NOTION_API_KEY
5. For each Notion database you intend to use as a project destination:
  - Open the database in Notion
  - Click ... → Connect to → select your integration
6. Ensure each database has the following properties with the exact names and types specified in Section 5.4 of the spec:
  - Name (Title)
  - Category (Select) — add all 7 taxonomy options as select options
  - Owner (Text)
  - Due Date (Date)
  - Meeting (Text)
  - Meeting Date (Date)

---

## 5. AI Provider

Anthropic:

1. Go to [https://console.anthropic.com](https://console.anthropic.com) and create an API key
2. Set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY=your-key

Google Gemini:

1. Go to [https://aistudio.google.com](https://aistudio.google.com) and create an API key
2. Set AI_PROVIDER=gemini and GOOGLE_AI_STUDIO_API_KEY=your-key

Only one provider needs to be configured at a time.

---

## 6. .env.example

The repository must include a .env.example file at the root level. This file lists every required environment variable with empty values and inline comments. It must never contain real secrets. It is committed to version control.

bash

# Auth

NEXTAUTH_SECRET=                       # generate with: openssl rand -base64 32
NEXTAUTH_URL=                          # [http://localhost:3000](http://localhost:3000) for local; your Vercel URL for production

# Google OAuth

GOOGLE_CLIENT_ID=                      # from Google Cloud Console → APIs & Services → Credentials
GOOGLE_CLIENT_SECRET=                  # from Google Cloud Console → APIs & Services → Credentials

# AI Provider

AI_PROVIDER=                           # anthropic or gemini
ANTHROPIC_API_KEY=                     # required if AI_PROVIDER=anthropic
GOOGLE_AI_STUDIO_API_KEY=              # required if AI_PROVIDER=gemini

# Supabase

NEXT_PUBLIC_SUPABASE_URL=              # from Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # from Supabase → Project Settings → API
SUPABASE_SERVICE_ROLE_KEY=             # from Supabase → Project Settings → API

# Slack

SLACK_BOT_TOKEN=                       # from Slack app → OAuth & Permissions → Bot User OAuth Token

# Notion

NOTION_API_KEY=                        # from Notion → Settings → Integrations; leave blank if not using Notion


---

## 7. Local Development

1. If you have not yet bootstrapped the Next.js app, do this from the parent directory of your cloned repo — not from inside it:

bash
cd ..
npx create-next-app@latest post-meeting-workflow-automation --typescript --app --no-tailwind --eslint --src-dir --import-alias "@/*"

create-next-app will detect that the directory already exists and ask if you want to proceed. Confirm yes. It will scaffold the Next.js project into the existing directory without deleting files already there (README.md, SETUP.md, etc.).

2. Move back into the project directory:

bash
cd post-meeting-workflow-automation

3. Install additional dependencies:

npm install @supabase/supabase-js next-auth@beta googleapis @anthropic-ai/sdk @google/generative-ai @slack/web-api @notionhq/client

4. Copy the environment variable template:

bash
cp .env.example .env.local

5. Fill in .env.local with the values gathered in steps 1–5.

6. Run the development server:

bash
npm run dev

7. Open http://localhost:3000 and sign in with your Google account.

---

## 8. Production Deployment (Vercel)

1. Push the repository to GitHub
2. Go to [https://vercel.com](https://vercel.com) and import the repository
3. In the Vercel project settings, add all environment variables from .env.local with production values:
  - Update NEXTAUTH_URL to your Vercel deployment URL
  - Update the Google OAuth authorised redirect URI in the Google Cloud Console to match your Vercel URL
4. Deploy — Vercel will build and deploy automatically on every push to the main branch

---

## 9. First-Time App Configuration

Once deployed:

1. Sign in to the app with your Google account
2. Navigate to Projects and create at least one project configuration:
  - Project name
  - Slack channel ID (find this in Slack: right-click the channel → Copy link — the ID is the string starting with C at the end of the URL)
  - Destination type: notion or sheets
  - Destination ID:
    - Notion: open the database in Notion, click ... → Copy link — the ID is the 32-character string in the URL before the ?
    - Sheets: open the spreadsheet, copy the ID from the URL between /d/ and /edit
3. Click Trigger to run your first workflow