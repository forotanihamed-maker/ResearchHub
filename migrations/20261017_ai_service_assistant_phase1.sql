-- ResearchHub AI service assistant — phase 1 (data model only).
-- This file is generated for review; do NOT execute against production automatically.

DO $$ BEGIN
  CREATE TYPE error_source AS ENUM ('server', 'client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_task_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_task_status AS ENUM ('open', 'in_progress', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_task_source_type AS ENUM ('report', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_pending_action_status AS ENUM (
    'pending', 'approved', 'rejected', 'expired', 'executed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS issue_reports (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES users(id) ON DELETE SET NULL,
  page_path varchar(512) NOT NULL,
  description text NOT NULL,
  category varchar(80) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'new',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS issue_reports_user_id_idx ON issue_reports(user_id);
CREATE INDEX IF NOT EXISTS issue_reports_status_idx ON issue_reports(status);
CREATE INDEX IF NOT EXISTS issue_reports_created_at_idx ON issue_reports(created_at);

-- Intentionally excludes request bodies, cookies, authorization headers and raw tokens.
CREATE TABLE IF NOT EXISTS error_events (
  id SERIAL PRIMARY KEY,
  source error_source NOT NULL,
  route varchar(512) NOT NULL,
  message text NOT NULL,
  stack_hash varchar(128) NOT NULL,
  fingerprint varchar(128) NOT NULL UNIQUE,
  count integer NOT NULL DEFAULT 1,
  first_seen_at timestamp NOT NULL DEFAULT now(),
  last_seen_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS error_events_source_idx ON error_events(source);
CREATE INDEX IF NOT EXISTS error_events_route_idx ON error_events(route);
CREATE INDEX IF NOT EXISTS error_events_last_seen_at_idx ON error_events(last_seen_at);

CREATE TABLE IF NOT EXISTS ai_tasks (
  id SERIAL PRIMARY KEY,
  title varchar(255) NOT NULL,
  summary text NOT NULL,
  severity ai_task_severity NOT NULL,
  category varchar(80) NOT NULL,
  status ai_task_status NOT NULL DEFAULT 'open',
  suggested_fix text,
  confidence numeric(4,3),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_tasks_severity_idx ON ai_tasks(severity);
CREATE INDEX IF NOT EXISTS ai_tasks_status_idx ON ai_tasks(status);
CREATE INDEX IF NOT EXISTS ai_tasks_category_idx ON ai_tasks(category);
CREATE INDEX IF NOT EXISTS ai_tasks_created_at_idx ON ai_tasks(created_at);

-- source_id is polymorphic and intentionally has no foreign key.
CREATE TABLE IF NOT EXISTS ai_task_sources (
  id SERIAL PRIMARY KEY,
  task_id integer NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
  source_type ai_task_source_type NOT NULL,
  source_id integer NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_task_sources_task_id_idx ON ai_task_sources(task_id);
CREATE INDEX IF NOT EXISTS ai_task_sources_source_lookup_idx ON ai_task_sources(source_type, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS ai_task_sources_unique_source_idx
  ON ai_task_sources(task_id, source_type, source_id);

CREATE TABLE IF NOT EXISTS ai_analysis_runs (
  id SERIAL PRIMARY KEY,
  task_id integer NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
  model varchar(160) NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_analysis_runs_task_id_idx ON ai_analysis_runs(task_id);
CREATE INDEX IF NOT EXISTS ai_analysis_runs_created_at_idx ON ai_analysis_runs(created_at);

CREATE TABLE IF NOT EXISTS ai_budget (
  id SERIAL PRIMARY KEY,
  month varchar(7) NOT NULL,
  cap_usd numeric(12,4) NOT NULL,
  consumed_usd numeric(12,6) NOT NULL DEFAULT 0,
  kill_switch boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_budget_month_idx ON ai_budget(month);

CREATE TABLE IF NOT EXISTS ai_tool_calls (
  id SERIAL PRIMARY KEY,
  run_id integer NOT NULL REFERENCES ai_analysis_runs(id) ON DELETE CASCADE,
  tool_name varchar(160) NOT NULL,
  args_hash varchar(128) NOT NULL,
  allowed boolean NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_tool_calls_run_id_idx ON ai_tool_calls(run_id);
CREATE INDEX IF NOT EXISTS ai_tool_calls_created_at_idx ON ai_tool_calls(created_at);

-- Storage only in this phase; no approval or execution behavior is introduced.
CREATE TABLE IF NOT EXISTS ai_pending_actions (
  id SERIAL PRIMARY KEY,
  action_type varchar(160) NOT NULL,
  params_json jsonb NOT NULL,
  params_hash varchar(128) NOT NULL,
  status ai_pending_action_status NOT NULL DEFAULT 'pending',
  expires_at timestamp NOT NULL,
  approved_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_pending_actions_status_idx ON ai_pending_actions(status);
CREATE INDEX IF NOT EXISTS ai_pending_actions_expires_at_idx ON ai_pending_actions(expires_at);
CREATE INDEX IF NOT EXISTS ai_pending_actions_approved_by_idx ON ai_pending_actions(approved_by);
