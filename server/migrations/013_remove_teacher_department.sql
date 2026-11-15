BEGIN;

ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_department_check;
ALTER TABLE teachers DROP COLUMN IF EXISTS department;

UPDATE application_state
SET state = jsonb_set(
  state,
  '{teachers}',
  (
    SELECT jsonb_agg(teacher - 'department')
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
    WHERE teacher ? 'department'
  );

INSERT INTO schema_migrations (version, name)
VALUES (13, 'remove_teacher_department')
ON CONFLICT (version) DO NOTHING;

COMMIT;
