BEGIN;

ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_department_check;

UPDATE teachers
SET department = 'BK'
WHERE department = 'Ilmu Pendidikan dan Psikologi'
   OR lower(subject) LIKE '%bimbingan konseling%';

ALTER TABLE teachers
  ADD CONSTRAINT teachers_department_check CHECK (
    department IN (
      'Manajemen Pendidikan',
      'MIPA (Sains)',
      'Bahasa dan Sastra',
      'BK',
      'Pendidikan Agama dan Keagamaan',
      'Ilmu Sosial dan Humaniora',
      'Pendidikan Jasmani dan Olahraga',
      'Seni, Desain, dan Keterampilan'
    )
  );

UPDATE application_state
SET state = jsonb_set(
  state,
  '{teachers}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN teacher->>'department' = 'Ilmu Pendidikan dan Psikologi'
          OR lower(COALESCE(teacher->>'subject', '')) LIKE '%bimbingan konseling%'
        THEN jsonb_set(teacher, '{department}', to_jsonb('BK'::text), true)
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
  AND jsonb_typeof(state->'teachers') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(state->'teachers', '[]'::jsonb)) AS items(teacher)
    WHERE teacher->>'department' = 'Ilmu Pendidikan dan Psikologi'
       OR lower(COALESCE(teacher->>'subject', '')) LIKE '%bimbingan konseling%'
  );

INSERT INTO schema_migrations (version, name)
VALUES (12, 'bk_department')
ON CONFLICT (version) DO NOTHING;

COMMIT;
