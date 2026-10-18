-- TEST DATABASE ONLY. Runs inside BEGIN ... ROLLBACK, but never point it at production.
-- Usage: psql "%TEST_DATABASE_URL%" -f scripts/verify-ai-behavior.sql
\set ON_ERROR_STOP off
\pset tuples_only on
BEGIN;
INSERT INTO users(name,email,password,role,department) VALUES ('t','t1@x.io','x','student','هوش مصنوعی') RETURNING id \gset u_
INSERT INTO users(name,email,password,role,department) VALUES ('adm','t2@x.io','x','admin','هوش مصنوعی') RETURNING id \gset a_
\echo T1 defaults:
INSERT INTO issue_reports(user_id,page_path,description) VALUES (:u_id,'/dashboard','x') RETURNING status, created_at IS NOT NULL;
INSERT INTO ai_tasks(title,summary,severity) VALUES ('t','s','high') RETURNING status, confidence IS NULL;
\echo T2 reject invalid enum / missing NOT NULL:
SAVEPOINT s; INSERT INTO ai_tasks(title,summary,severity) VALUES ('t','s','urgent'); ROLLBACK TO s;
SAVEPOINT s; INSERT INTO ai_tasks(title,summary) VALUES ('t','s'); ROLLBACK TO s;
SAVEPOINT s; INSERT INTO issue_reports(description) VALUES ('no path'); ROLLBACK TO s;
\echo T3 fingerprint unique:
INSERT INTO error_events(source,route,message,fingerprint) VALUES ('server','/api/x','m','fp1');
SAVEPOINT s; INSERT INTO error_events(source,route,message,fingerprint) VALUES ('server','/api/x','m','fp1'); ROLLBACK TO s;
INSERT INTO error_events(source,route,message,fingerprint) VALUES ('server','/api/x','m','fp1') ON CONFLICT (fingerprint) DO UPDATE SET count=error_events.count+1, last_seen_at=now() RETURNING count;
\echo T4 task source unique + cascade:
INSERT INTO ai_task_sources(task_id,source_type,source_id) SELECT id,'report',1 FROM ai_tasks LIMIT 1;
SAVEPOINT s; INSERT INTO ai_task_sources(task_id,source_type,source_id) SELECT id,'report',1 FROM ai_tasks LIMIT 1; ROLLBACK TO s;
\echo T4b same source attached to a SECOND task (must be REJECTED):
INSERT INTO ai_tasks(title,summary,severity) VALUES ('t2','s','low');
SAVEPOINT s; INSERT INTO ai_task_sources(task_id,source_type,source_id) SELECT max(id),'report',1 FROM ai_tasks; ROLLBACK TO s;
\echo T5 run keeps cost when task deleted (set null) and tool calls cascade with run:
INSERT INTO ai_analysis_runs(task_id,model,cost_usd) SELECT min(id),'m',0.001234 FROM ai_tasks RETURNING id \gset r_
INSERT INTO ai_tool_calls(run_id,tool_name,args_hash,allowed) VALUES (:r_id,'submit_triage','h',true);
DELETE FROM ai_tasks WHERE id=(SELECT task_id FROM ai_analysis_runs WHERE id=:r_id);
SELECT 'run kept, task_id null =', task_id IS NULL, cost_usd FROM ai_analysis_runs WHERE id=:r_id;
SELECT 'sources left for deleted task =', count(*) FROM ai_task_sources WHERE task_id NOT IN (SELECT id FROM ai_tasks);
DELETE FROM ai_analysis_runs WHERE id=:r_id;
SELECT 'tool_calls after run delete =', count(*) FROM ai_tool_calls;
\echo T6 delete user -> report kept with null user; pending action approver nulled:
INSERT INTO ai_pending_actions(action_type,params_json,params_hash,expires_at,approved_by) VALUES ('x','{"a":1}','h',now()+interval '1 hour',:a_id);
DELETE FROM users WHERE id IN (:u_id,:a_id);
SELECT 'reports', count(*), count(user_id) FROM issue_reports;
SELECT 'pending approved_by null =', approved_by IS NULL FROM ai_pending_actions;
\echo T7 budget month unique:
INSERT INTO ai_budget(month,monthly_cap_usd) VALUES ('2026-10',10);
SAVEPOINT s; INSERT INTO ai_budget(month,monthly_cap_usd) VALUES ('2026-10',20); ROLLBACK TO s;
\echo T8 confidence range: 7.5 and -0.1 must be REJECTED, 0.8 / 0 / 1 / NULL accepted:
SAVEPOINT s; INSERT INTO ai_tasks(title,summary,severity,confidence) VALUES ('c','s','low',7.5); ROLLBACK TO s;
SAVEPOINT s; INSERT INTO ai_tasks(title,summary,severity,confidence) VALUES ('c','s','low',-0.1); ROLLBACK TO s;
INSERT INTO ai_tasks(title,summary,severity,confidence) VALUES ('c','s','low',0.8),('c','s','low',0),('c','s','low',1),('c','s','low',NULL);
ROLLBACK;
