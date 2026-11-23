BEGIN;

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS facebook_url text;

INSERT INTO schema_migrations (version, name)
VALUES (16, 'announcement_facebook_url')
ON CONFLICT (version) DO NOTHING;

COMMIT;
