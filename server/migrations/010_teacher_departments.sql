BEGIN;

ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_department_check;

UPDATE teachers
SET department = CASE
  WHEN lower(subject) LIKE '%kepala sekolah%' THEN 'Manajemen Pendidikan'
  WHEN lower(subject) LIKE '%biologi%'
    OR lower(subject) LIKE '%fisika%'
    OR lower(subject) LIKE '%kimia%'
    OR lower(subject) LIKE '%matematika%'
    OR lower(subject) LIKE '%informatika%' THEN 'MIPA (Sains)'
  WHEN lower(subject) LIKE '%bahasa indonesia%'
    OR lower(subject) LIKE '%bahasa inggris%' THEN 'Bahasa dan Sastra'
  WHEN lower(subject) LIKE '%bimbingan konseling%' THEN 'Ilmu Pendidikan dan Psikologi'
  WHEN lower(subject) LIKE '%agama islam%'
    OR lower(subject) LIKE '%agama kristen%' THEN 'Pendidikan Agama dan Keagamaan'
  WHEN lower(subject) LIKE '%sejarah%'
    OR lower(subject) LIKE '%geografi%'
    OR lower(subject) LIKE '%ppkn%' THEN 'Ilmu Sosial dan Humaniora'
  WHEN department = 'MIPA' THEN 'MIPA (Sains)'
  WHEN department = 'Bahasa' THEN 'Bahasa dan Sastra'
  WHEN department IN ('IPS', 'Seni & Olahraga') THEN 'Ilmu Sosial dan Humaniora'
  WHEN department = 'BK' THEN 'Ilmu Pendidikan dan Psikologi'
  WHEN department = 'Informatika' THEN 'MIPA (Sains)'
  WHEN department = 'Kepala Sekolah' THEN 'Manajemen Pendidikan'
  ELSE 'Ilmu Sosial dan Humaniora'
END;

ALTER TABLE teachers
  ADD CONSTRAINT teachers_department_check CHECK (
    department IN (
      'Manajemen Pendidikan',
      'MIPA (Sains)',
      'Bahasa dan Sastra',
      'Ilmu Pendidikan dan Psikologi',
      'Pendidikan Agama dan Keagamaan',
      'Ilmu Sosial dan Humaniora'
    )
  );

UPDATE application_state
SET state = jsonb_set(
  state,
  '{teachers}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        teacher,
        '{department}',
        to_jsonb(
          CASE
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%kepala sekolah%' THEN 'Manajemen Pendidikan'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%biologi%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%fisika%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%kimia%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%matematika%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%informatika%' THEN 'MIPA (Sains)'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%bahasa indonesia%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%bahasa inggris%' THEN 'Bahasa dan Sastra'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%bimbingan konseling%' THEN 'Ilmu Pendidikan dan Psikologi'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%agama islam%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%agama kristen%' THEN 'Pendidikan Agama dan Keagamaan'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%sejarah%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%geografi%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%ppkn%' THEN 'Ilmu Sosial dan Humaniora'
            WHEN teacher->>'department' = 'MIPA' THEN 'MIPA (Sains)'
            WHEN teacher->>'department' = 'Bahasa' THEN 'Bahasa dan Sastra'
            WHEN teacher->>'department' IN ('IPS', 'Seni & Olahraga') THEN 'Ilmu Sosial dan Humaniora'
            WHEN teacher->>'department' = 'BK' THEN 'Ilmu Pendidikan dan Psikologi'
            WHEN teacher->>'department' = 'Informatika' THEN 'MIPA (Sains)'
            WHEN teacher->>'department' = 'Kepala Sekolah' THEN 'Manajemen Pendidikan'
            ELSE 'Ilmu Sosial dan Humaniora'
          END
        ),
        true
      )
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
    WHERE COALESCE(teacher->>'department', '') NOT IN (
      'Manajemen Pendidikan',
      'MIPA (Sains)',
      'Bahasa dan Sastra',
      'Ilmu Pendidikan dan Psikologi',
      'Pendidikan Agama dan Keagamaan',
      'Ilmu Sosial dan Humaniora'
    )
  );

INSERT INTO schema_migrations (version, name)
VALUES (10, 'teacher_departments')
ON CONFLICT (version) DO NOTHING;

COMMIT;
