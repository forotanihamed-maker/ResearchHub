-- ResearchHub admin/professor approval migration.
-- Apply this to an existing database whose current users table does not yet
-- contain professor_status.

-- PostgreSQL enum values added by ALTER TYPE must not be used inside the same
-- explicit transaction on versions where the new value is only usable after
-- commit, so this statement intentionally stays outside BEGIN/COMMIT.
ALTER TYPE role ADD VALUE IF NOT EXISTS 'admin';

DO $$
BEGIN
  CREATE TYPE professor_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS professor_status professor_status;

UPDATE users
SET professor_status = 'approved'
WHERE professor_status IS NULL;

ALTER TABLE users
  ALTER COLUMN professor_status SET DEFAULT 'approved';

ALTER TABLE users
  ALTER COLUMN professor_status SET NOT NULL;

CREATE TABLE IF NOT EXISTS admin_departments (
  admin_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department department NOT NULL,
  PRIMARY KEY (admin_id, department)
);

CREATE INDEX IF NOT EXISTS admin_departments_admin_id_idx
  ON admin_departments(admin_id);

CREATE TABLE IF NOT EXISTS direct_messages (
  id serial PRIMARY KEY,
  sender_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS direct_messages_sender_id_idx
  ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_id_idx
  ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx
  ON direct_messages(created_at);

INSERT INTO admin_departments (admin_id, department)
SELECT u.id, d.department::department
FROM users AS u
CROSS JOIN (
  VALUES
    ('مهندسی نرم‌افزار'),
    ('هوش مصنوعی'),
    ('شبکه‌های کامپیوتری'),
    ('معماری سیستم‌های کامپیوتری'),
    ('امنیت اطلاعات'),
    ('علوم داده')
) AS d(department)
WHERE u.email = 'admin@researchhub.ir'
  AND u.role::text = 'admin'
ON CONFLICT DO NOTHING;
