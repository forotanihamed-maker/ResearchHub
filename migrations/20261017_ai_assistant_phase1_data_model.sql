-- AI assistant — مرحله ۱: مدل داده. فقط ساختار؛ هیچ داده‌ای درج یا تغییر
-- نمی‌شود. همه‌ی دستورها idempotent هستند (IF NOT EXISTS / duplicate_object).

DO $$ BEGIN
  CREATE TYPE issue_report_status AS ENUM ('new','triaged','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE error_source AS ENUM ('server','client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE ai_task_severity AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE ai_task_status AS ENUM ('open','in_progress','resolved','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE ai_source_type AS ENUM ('report','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE ai_action_status AS ENUM ('pending','approved','rejected','expired','executed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS issue_reports (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES users(id) ON DELETE SET NULL,
  page_path varchar(500) NOT NULL,
  description text NOT NULL,
  category varchar(50),
  status issue_report_status NOT NULL DEFAULT 'new',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS issue_reports_user_created_idx ON issue_reports(user_id, created_at);
CREATE INDEX IF NOT EXISTS issue_reports_status_idx ON issue_reports(status);

CREATE TABLE IF NOT EXISTS error_events (
  id SERIAL PRIMARY KEY,
  source error_source NOT NULL,
  route varchar(255) NOT NULL,
  message text NOT NULL,
  stack_hash varchar(64),
  fingerprint varchar(64) NOT NULL,
  count integer NOT NULL DEFAULT 1,
  first_seen_at timestamp NOT NULL DEFAULT now(),
  last_seen_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS error_events_fingerprint_uidx ON error_events(fingerprint);
CREATE INDEX IF NOT EXISTS error_events_last_seen_idx ON error_events(last_seen_at);

CREATE TABLE IF NOT EXISTS ai_tasks (
  id SERIAL PRIMARY KEY,
  title varchar(255) NOT NULL,
  summary text NOT NULL,
  severity ai_task_severity NOT NULL,
  category varchar(50),
  status ai_task_status NOT NULL DEFAULT 'open',
  suggested_fix text,
  confidence real,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT ai_tasks_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);
CREATE INDEX IF NOT EXISTS ai_tasks_status_severity_idx ON ai_tasks(status, severity);

CREATE TABLE IF NOT EXISTS ai_task_sources (
  id SERIAL PRIMARY KEY,
  task_id integer NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
  source_type ai_source_type NOT NULL,
  source_id integer NOT NULL
);
-- هر منبع حداکثر به یک تسک وصل می‌شود (idempotency مرحله ۴).
CREATE UNIQUE INDEX IF NOT EXISTS ai_task_sources_source_uidx ON ai_task_sources(source_type, source_id);
CREATE INDEX IF NOT EXISTS ai_task_sources_task_id_idx ON ai_task_sources(task_id);

CREATE TABLE IF NOT EXISTS ai_analysis_runs (
  id SERIAL PRIMARY KEY,
  task_id integer REFERENCES ai_tasks(id) ON DELETE SET NULL,
  model varchar(100) NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_analysis_runs_task_id_idx ON ai_analysis_runs(task_id);

CREATE TABLE IF NOT EXISTS ai_budget (
  id SERIAL PRIMARY KEY,
  month varchar(7) NOT NULL UNIQUE,
  monthly_cap_usd numeric(12,6) NOT NULL,
  used_usd numeric(12,6) NOT NULL DEFAULT 0,
  kill_switch boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS ai_tool_calls (
  id SERIAL PRIMARY KEY,
  run_id integer NOT NULL REFERENCES ai_analysis_runs(id) ON DELETE CASCADE,
  tool_name varchar(100) NOT NULL,
  args_hash varchar(64) NOT NULL,
  allowed boolean NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_tool_calls_run_id_idx ON ai_tool_calls(run_id);

CREATE TABLE IF NOT EXISTS ai_pending_actions (
  id SERIAL PRIMARY KEY,
  action_type varchar(100) NOT NULL,
  params_json jsonb NOT NULL,
  params_hash varchar(64) NOT NULL,
  status ai_action_status NOT NULL DEFAULT 'pending',
  expires_at timestamp NOT NULL,
  approved_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_pending_actions_status_expires_idx ON ai_pending_actions(status, expires_at);
