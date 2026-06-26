-- Telemetry tables for MindScape
--
-- Creates/ensures existence of:
--   1. ai_calls         — AI provider telemetry (orchestrator.ts → admin dashboard)
--   2. analytics_events — Client-side event analytics (AnalyticsTracker → /api/analytics/track)
--
-- NOTE: We use both CREATE TABLE IF NOT EXISTS and ADD COLUMN IF NOT EXISTS
-- to handle cases where the table was already created by an older migration
-- script with different column names (e.g. latency_ms instead of duration_ms).

-- ── 1. AI Call Telemetry ────────────────────────────────────────────────
-- Written to by recordTelemetry() in src/ai/providers/orchestrator.ts
-- Read by the admin dashboard Telemetry tab via /api/admin/unified

CREATE TABLE IF NOT EXISTS ai_calls (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
);

-- Add columns idempotently (handles pre-existing table with stale schema)
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'unspecified';
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS was_error BOOLEAN DEFAULT false;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS repair_applied BOOLEAN DEFAULT false;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS salvaged BOOLEAN DEFAULT false;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Performance indexes for admin dashboard queries (IF NOT EXISTS = idempotent)
CREATE INDEX IF NOT EXISTS idx_ai_calls_created    ON ai_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_calls_was_error  ON ai_calls(was_error);
CREATE INDEX IF NOT EXISTS idx_ai_calls_task_type  ON ai_calls(task_type);
CREATE INDEX IF NOT EXISTS idx_ai_calls_user_id    ON ai_calls(user_id);

-- RLS: service role only (server-side telemetry)
ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_calls' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON ai_calls FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 2. Client Analytics Events ──────────────────────────────────────────
-- Written to by /api/analytics/track (POST)
-- Client-side AnalyticsTracker queues events and flushes every 5 s.

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY
);

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_name TEXT NOT NULL DEFAULT '';
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}'::jsonb;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS timestamp BIGINT NOT NULL DEFAULT 0;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL DEFAULT '';
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS month TEXT;

-- Indexes for dashboard / analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_date      ON analytics_events(date);
CREATE INDEX IF NOT EXISTS idx_analytics_events_month     ON analytics_events(month);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category  ON analytics_events(category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_received  ON analytics_events(received_at DESC);

-- RLS: service role only (server-side ingestion)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON analytics_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
