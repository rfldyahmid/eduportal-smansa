BEGIN;

ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_department_check;

UPDATE teachers
SET subject = CASE
      WHEN lower(subject) LIKE '%kepala sekolah%' THEN 'Kepala Sekolah'
      WHEN lower(subject) LIKE '%biologi%' OR lower(subject) LIKE '%ekologi%' THEN 'Biologi'
      WHEN lower(subject) LIKE '%fisika%' THEN 'Fisika'
      WHEN lower(subject) LIKE '%matematika%' THEN 'Matematika'
      WHEN lower(subject) LIKE '%kimia%' THEN 'Kimia'
      WHEN lower(subject) LIKE '%bahasa%' AND lower(subject) LIKE '%indonesia%' THEN 'Bahasa Indonesia'
      WHEN lower(subject) LIKE '%bahasa%' AND lower(subject) LIKE '%inggris%' THEN 'Bahasa Inggris'
      WHEN lower(subject) LIKE '%bimbingan konseling%' THEN 'Bimbingan Konseling'
      WHEN lower(subject) LIKE '%agama islam%' THEN 'Agama Islam'
      WHEN lower(subject) LIKE '%agama kristen%' THEN 'Agama Kristen'
      WHEN lower(subject) LIKE '%sejarah%' THEN 'Sejarah'
      WHEN lower(subject) LIKE '%geografi%' THEN 'Geografi'
      WHEN lower(subject) LIKE '%ppkn%' THEN 'PPKN'
      WHEN lower(subject) LIKE '%olahraga%' OR lower(subject) LIKE '%jasmani%' THEN 'Olahraga'
      WHEN lower(subject) LIKE '%prakarya%' THEN 'Prakarya'
      ELSE subject
    END,
    department = CASE
      WHEN lower(subject) LIKE '%kepala sekolah%' THEN 'Manajemen Pendidikan'
      WHEN lower(subject) LIKE '%biologi%' OR lower(subject) LIKE '%ekologi%'
        OR lower(subject) LIKE '%fisika%' OR lower(subject) LIKE '%matematika%'
        OR lower(subject) LIKE '%kimia%' THEN 'MIPA (Sains)'
      WHEN lower(subject) LIKE '%bahasa%' AND (lower(subject) LIKE '%indonesia%' OR lower(subject) LIKE '%inggris%')
        THEN 'Bahasa dan Sastra'
      WHEN lower(subject) LIKE '%bimbingan konseling%' THEN 'Ilmu Pendidikan dan Psikologi'
      WHEN lower(subject) LIKE '%agama islam%' OR lower(subject) LIKE '%agama kristen%'
        THEN 'Pendidikan Agama dan Keagamaan'
      WHEN lower(subject) LIKE '%sejarah%' OR lower(subject) LIKE '%geografi%' OR lower(subject) LIKE '%ppkn%'
        THEN 'Ilmu Sosial dan Humaniora'
      WHEN lower(subject) LIKE '%olahraga%' OR lower(subject) LIKE '%jasmani%'
        THEN 'Pendidikan Jasmani dan Olahraga'
      WHEN lower(subject) LIKE '%prakarya%' THEN 'Seni, Desain, dan Keterampilan'
      WHEN department = 'MIPA' THEN 'MIPA (Sains)'
      WHEN department = 'Bahasa' THEN 'Bahasa dan Sastra'
      WHEN department IN ('IPS', 'Seni & Olahraga') THEN 'Ilmu Sosial dan Humaniora'
      WHEN department = 'BK' THEN 'Ilmu Pendidikan dan Psikologi'
      WHEN department = 'Informatika' THEN 'MIPA (Sains)'
      WHEN department = 'Kepala Sekolah' THEN 'Manajemen Pendidikan'
      ELSE department
    END;

ALTER TABLE teachers
  ADD CONSTRAINT teachers_department_check CHECK (
    department IN (
      'Manajemen Pendidikan',
      'MIPA (Sains)',
      'Bahasa dan Sastra',
      'Ilmu Pendidikan dan Psikologi',
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
      jsonb_set(
        jsonb_set(
          teacher,
          '{subject}',
          to_jsonb(CASE
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%kepala sekolah%' THEN 'Kepala Sekolah'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%biologi%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%ekologi%' THEN 'Biologi'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%fisika%' THEN 'Fisika'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%matematika%' THEN 'Matematika'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%kimia%' THEN 'Kimia'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%bahasa%'
              AND lower(COALESCE(teacher->>'subject', '')) LIKE '%indonesia%' THEN 'Bahasa Indonesia'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%bahasa%'
              AND lower(COALESCE(teacher->>'subject', '')) LIKE '%inggris%' THEN 'Bahasa Inggris'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%bimbingan konseling%' THEN 'Bimbingan Konseling'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%agama islam%' THEN 'Agama Islam'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%agama kristen%' THEN 'Agama Kristen'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%sejarah%' THEN 'Sejarah'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%geografi%' THEN 'Geografi'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%ppkn%' THEN 'PPKN'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%olahraga%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%jasmani%' THEN 'Olahraga'
            WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%prakarya%' THEN 'Prakarya'
            ELSE COALESCE(teacher->>'subject', '')
          END),
          true
        ),
        '{department}',
        to_jsonb(CASE
          WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%kepala sekolah%' THEN 'Manajemen Pendidikan'
          WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%biologi%'
            OR lower(COALESCE(teacher->>'subject', '')) LIKE '%ekologi%'
            OR lower(COALESCE(teacher->>'subject', '')) LIKE '%fisika%'
            OR lower(COALESCE(teacher->>'subject', '')) LIKE '%matematika%'
            OR lower(COALESCE(teacher->>'subject', '')) LIKE '%kimia%' THEN 'MIPA (Sains)'
          WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%bahasa%'
            AND (lower(COALESCE(teacher->>'subject', '')) LIKE '%indonesia%'
              OR lower(COALESCE(teacher->>'subject', '')) LIKE '%inggris%') THEN 'Bahasa dan Sastra'
          WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%bimbingan konseling%' THEN 'Ilmu Pendidikan dan Psikologi'
          WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%agama islam%'
            OR lower(COALESCE(teacher->>'subject', '')) LIKE '%agama kristen%' THEN 'Pendidikan Agama dan Keagamaan'
          WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%sejarah%'
            OR lower(COALESCE(teacher->>'subject', '')) LIKE '%geografi%'
            OR lower(COALESCE(teacher->>'subject', '')) LIKE '%ppkn%' THEN 'Ilmu Sosial dan Humaniora'
          WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%olahraga%'
            OR lower(COALESCE(teacher->>'subject', '')) LIKE '%jasmani%' THEN 'Pendidikan Jasmani dan Olahraga'
          WHEN lower(COALESCE(teacher->>'subject', '')) LIKE '%prakarya%' THEN 'Seni, Desain, dan Keterampilan'
          WHEN teacher->>'department' = 'MIPA' THEN 'MIPA (Sains)'
          WHEN teacher->>'department' = 'Bahasa' THEN 'Bahasa dan Sastra'
          WHEN teacher->>'department' IN ('IPS', 'Seni & Olahraga') THEN 'Ilmu Sosial dan Humaniora'
          WHEN teacher->>'department' = 'BK' THEN 'Ilmu Pendidikan dan Psikologi'
          WHEN teacher->>'department' = 'Informatika' THEN 'MIPA (Sains)'
          WHEN teacher->>'department' = 'Kepala Sekolah' THEN 'Manajemen Pendidikan'
          ELSE teacher->>'department'
        END),
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
      'Ilmu Sosial dan Humaniora',
      'Pendidikan Jasmani dan Olahraga',
      'Seni, Desain, dan Keterampilan'
    )
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%kepala sekolah%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%biologi%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%ekologi%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%fisika%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%matematika%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%kimia%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%bahasa%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%bimbingan konseling%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%agama islam%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%agama kristen%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%sejarah%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%geografi%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%ppkn%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%olahraga%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%jasmani%'
    OR lower(COALESCE(teacher->>'subject', '')) LIKE '%prakarya%'
  );

INSERT INTO schema_migrations (version, name)
VALUES (11, 'teacher_subject_mapping')
ON CONFLICT (version) DO NOTHING;

COMMIT;
