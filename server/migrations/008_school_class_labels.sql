DO $$
DECLARE
  old_class record;
  matched text[];
  new_class_id text;
BEGIN
  FOR old_class IN
    SELECT id
    FROM school_classes
    WHERE id ~ '^(XII|XI|X)(-(MIPA|IPS|FASE-E.*))?-[1-5]$'
  LOOP
    matched := regexp_match(old_class.id, '^(XII|XI|X)(?:-(?:MIPA|IPS|FASE-E.*))?-([1-5])$');
    IF matched IS NULL THEN
      CONTINUE;
    END IF;

    new_class_id := matched[1] || '-' || chr(64 + matched[2]::integer);
    INSERT INTO school_classes (id, name, academic_year)
    SELECT new_class_id, new_class_id, academic_year
    FROM school_classes
    WHERE id = old_class.id
    ON CONFLICT (id) DO NOTHING;

    UPDATE students SET class_id = new_class_id WHERE class_id = old_class.id;
    UPDATE schedules SET class_id = new_class_id WHERE class_id = old_class.id;
    UPDATE assignments SET class_id = new_class_id WHERE class_id = old_class.id;
    UPDATE assignment_submissions SET class_id = new_class_id WHERE class_id = old_class.id;
    UPDATE portal_announcements SET target_class = new_class_id WHERE target_class = old_class.id;

    INSERT INTO teacher_classes (teacher_id, class_id)
    SELECT teacher_id, new_class_id FROM teacher_classes WHERE class_id = old_class.id
    ON CONFLICT (teacher_id, class_id) DO NOTHING;
    DELETE FROM teacher_classes WHERE class_id = old_class.id;

    UPDATE teachers SET homeroom_class_id = new_class_id WHERE homeroom_class_id = old_class.id;
    UPDATE school_classes AS target
    SET homeroom_teacher_id = COALESCE(target.homeroom_teacher_id, source.homeroom_teacher_id)
    FROM school_classes AS source
    WHERE target.id = new_class_id AND source.id = old_class.id;

    DELETE FROM school_classes WHERE id = old_class.id;
  END LOOP;
END $$;

ALTER TABLE students DROP COLUMN IF EXISTS major;
ALTER TABLE school_classes DROP COLUMN IF EXISTS major;

INSERT INTO schema_migrations (version, name)
VALUES (8, 'school_class_labels')
ON CONFLICT (version) DO NOTHING;
