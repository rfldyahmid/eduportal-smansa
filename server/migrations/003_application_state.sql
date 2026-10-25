BEGIN;

CREATE TABLE IF NOT EXISTS application_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  state jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version, name)
VALUES (3, 'application_state')
ON CONFLICT (version) DO NOTHING;

COMMIT;
