-- Section و: student-created projects, privacy, usernames and direct invitations.

ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(30);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx ON users(username) WHERE username IS NOT NULL;

DO $$ BEGIN
  CREATE TYPE project_creator_role AS ENUM ('professor','student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE project_visibility AS ENUM ('public','private');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE application_source AS ENUM ('student_application','owner_invite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS creator_id integer;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS creator_role project_creator_role;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility project_visibility NOT NULL DEFAULT 'public';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invite_token varchar(128);

UPDATE projects SET creator_id = professor_id WHERE creator_id IS NULL;
UPDATE projects SET creator_role = 'professor' WHERE creator_role IS NULL;
ALTER TABLE projects ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN creator_role SET NOT NULL;
CREATE INDEX IF NOT EXISTS projects_creator_id_idx ON projects(creator_id);
CREATE INDEX IF NOT EXISTS projects_visibility_idx ON projects(visibility);
CREATE UNIQUE INDEX IF NOT EXISTS projects_invite_token_unique_idx ON projects(invite_token) WHERE invite_token IS NOT NULL;

ALTER TABLE projects ALTER COLUMN professor_id DROP NOT NULL;

ALTER TABLE projects ADD CONSTRAINT projects_creator_id_fk FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS source application_source NOT NULL DEFAULT 'student_application';
CREATE INDEX IF NOT EXISTS applications_source_idx ON applications(source);
