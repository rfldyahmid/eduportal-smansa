BEGIN;

CREATE TABLE IF NOT EXISTS uploaded_files (
  id text PRIMARY KEY,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS uploaded_files_created_at_idx ON uploaded_files (created_at);

INSERT INTO schema_migrations (version, name)
VALUES (4, 'uploaded_files')
ON CONFLICT (version) DO NOTHING;

COMMIT;
