-- Section ه.۲: Milestones — فضای اجرای پروژه، فاز ۲.

DO $$ BEGIN
  CREATE TYPE milestone_status AS ENUM ('pending','reached');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS project_milestones (
  id SERIAL PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  status milestone_status NOT NULL DEFAULT 'pending',
  reached_at timestamp,
  created_by integer NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_milestones_project_id_idx ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS project_milestones_status_idx ON project_milestones(status);
