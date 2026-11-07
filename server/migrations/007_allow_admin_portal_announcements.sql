ALTER TABLE portal_announcements
  ALTER COLUMN teacher_id DROP NOT NULL;

INSERT INTO schema_migrations (version, name)
VALUES (7, 'allow_admin_portal_announcements')
ON CONFLICT (version) DO NOTHING;
