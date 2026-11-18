BEGIN;

CREATE TABLE IF NOT EXISTS schedule_notification_reads (
  user_id text NOT NULL,
  notification_key text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS schedule_notification_reads_read_at_idx
  ON schedule_notification_reads (read_at DESC);

INSERT INTO schema_migrations (version, name)
VALUES (15, 'schedule_notification_reads')
ON CONFLICT (version) DO NOTHING;

COMMIT;
