BEGIN;

CREATE TABLE IF NOT EXISTS student_notification_reads (
  student_id text NOT NULL,
  notification_key text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, notification_key)
);

CREATE INDEX IF NOT EXISTS student_notification_reads_read_at_idx
  ON student_notification_reads (read_at DESC);

INSERT INTO schema_migrations (version, name)
VALUES (6, 'student_notification_reads')
ON CONFLICT (version) DO NOTHING;

COMMIT;
