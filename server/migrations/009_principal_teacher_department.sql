BEGIN;

ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_department_check;
ALTER TABLE teachers
  ADD CONSTRAINT teachers_department_check CHECK (
    department IN ('MIPA', 'Bahasa', 'IPS', 'Seni & Olahraga', 'BK', 'Informatika', 'Kepala Sekolah')
  );

UPDATE teachers
SET subject = 'Kepala Sekolah',
    department = 'Kepala Sekolah'
WHERE full_name ILIKE 'Abdul Kadir Talib%';

UPDATE application_state
SET state = jsonb_set(
      state,
      '{teachers}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN teacher->>'fullName' ILIKE 'Abdul Kadir Talib%'
            THEN jsonb_set(
              jsonb_set(teacher, '{subject}', to_jsonb('Kepala Sekolah'::text), true),
              '{department}',
              to_jsonb('Kepala Sekolah'::text),
              true
            )
            ELSE teacher
          END
        )
        FROM jsonb_array_elements(COALESCE(state->'teachers', '[]'::jsonb)) AS items(teacher)
      ),
      true
    ),
    revision = revision + 1,
    updated_at = now()
WHERE state ? 'teachers'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(state->'teachers', '[]'::jsonb)) AS items(teacher)
    WHERE teacher->>'fullName' ILIKE 'Abdul Kadir Talib%'
  );

INSERT INTO schema_migrations (version, name)
VALUES (9, 'principal_teacher_department')
ON CONFLICT (version) DO NOTHING;

COMMIT;
