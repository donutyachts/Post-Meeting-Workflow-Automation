-- Migration: 0001_create_projects
-- Creates the projects table and enables RLS.
--
-- All queries against this table are made server-side using the Supabase service
-- role key, which bypasses RLS. RLS is enabled here to prevent any direct
-- client-side access to the table.

CREATE TABLE IF NOT EXISTS projects (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  slack_channel_id TEXT        NOT NULL,
  destination_type TEXT        NOT NULL CHECK (destination_type IN ('notion', 'sheets')),
  destination_id   TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at current on every row update.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable RLS. No client-facing policies are added — service role is the only
-- caller, and it bypasses RLS by design.
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
