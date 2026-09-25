-- Section ه.۳: Activity — فضای اجرای پروژه، فاز ۳.

DO $$ BEGIN
  CREATE TYPE activity_entity_type AS ENUM ('task','milestone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'task_created',
    'task_status_changed',
    'task_deleted',
    'task_reassigned',
    'milestone_created',
    'milestone_reached',
    'milestone_reverted',
    'milestone_deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS project_activity (
  id SERIAL PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id integer NOT NULL REFERENCES users(id),
  entity_type activity_entity_type NOT NULL,
  entity_id integer NOT NULL,
  entity_title varchar(200) NOT NULL,
  type activity_type NOT NULL,
  detail varchar(200),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_activity_project_id_idx ON project_activity(project_id);
CREATE INDEX IF NOT EXISTS project_activity_created_at_idx ON project_activity(created_at);
