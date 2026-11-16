BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS gender text;

UPDATE users AS account
SET gender = student.gender
FROM students AS student
WHERE account.student_id = student.id
  AND account.gender IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_gender_check
      CHECK (gender IS NULL OR gender IN ('Laki-laki', 'Perempuan'));
  END IF;
END $$;

INSERT INTO schema_migrations (version, name)
VALUES (14, 'user_gender')
ON CONFLICT (version) DO NOTHING;

COMMIT;
