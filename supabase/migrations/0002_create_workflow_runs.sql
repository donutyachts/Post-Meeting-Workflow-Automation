-- Migration: 0002_create_workflow_runs
-- Creates the workflow_runs table and enables RLS.
--
-- workflow_runs is append-only from the application's perspective — no updates
-- are made after a run is logged. Deletion is not supported.

CREATE TABLE IF NOT EXISTS workflow_runs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_title         TEXT        NOT NULL,
  meeting_date          DATE        NOT NULL,
  meeting_duration_minutes INTEGER  NOT NULL,
  gemini_doc_id         TEXT        NOT NULL,
  project_id            UUID        REFERENCES projects (id) ON DELETE SET NULL,
  ai_provider           TEXT        NOT NULL CHECK (ai_provider IN ('anthropic', 'gemini')),
  approval_status       TEXT        NOT NULL CHECK (approval_status IN ('approved', 'discarded')),
  slack_status          TEXT        NOT NULL CHECK (slack_status IN ('success', 'failed', 'skipped')),
  destination_status    TEXT        NOT NULL CHECK (destination_status IN ('success', 'failed', 'skipped')),
  slack_thread_ts       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the run history screen (GET /api/runs reverse-chron order).
CREATE INDEX workflow_runs_created_at_idx ON workflow_runs (created_at DESC);

-- Enable RLS. No client-facing policies are added — service role is the only
-- caller, and it bypasses RLS by design.
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
