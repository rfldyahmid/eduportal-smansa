BEGIN;

CREATE TABLE IF NOT EXISTS deleted_items (
  id bigserial PRIMARY KEY,
  item_type text NOT NULL,
  item_id text NOT NULL,
  payload jsonb NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deleted_items_deleted_at_idx ON deleted_items (deleted_at DESC);
CREATE INDEX IF NOT EXISTS deleted_items_type_idx ON deleted_items (item_type);

CREATE OR REPLACE FUNCTION archive_application_state_deletions() RETURNS trigger AS $$
DECLARE
  collection_name text;
  removed_item jsonb;
  previous_items jsonb;
  current_items jsonb;
BEGIN
  IF current_setting('app.skip_trash', true) = 'true' THEN
    RETURN NEW;
  END IF;

  FOREACH collection_name IN ARRAY ARRAY[
    'users', 'students', 'teachers', 'schedules', 'ppdb', 'messages',
    'announcements', 'gallery', 'videos', 'kombelActivities', 'kombelAgendas',
    'assignments', 'submissions', 'portalAnnouncements'
  ] LOOP
    previous_items := COALESCE(OLD.state -> collection_name, '[]'::jsonb);
    current_items := COALESCE(NEW.state -> collection_name, '[]'::jsonb);
    FOR removed_item IN
      SELECT old_item
      FROM jsonb_array_elements(previous_items) AS old_item
      WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(current_items) AS current_item
        WHERE current_item ->> 'id' = old_item ->> 'id'
      )
    LOOP
      INSERT INTO deleted_items (item_type, item_id, payload)
      VALUES (collection_name, COALESCE(removed_item ->> 'id', 'unknown'), removed_item);
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS application_state_archive_deletions ON application_state;
CREATE TRIGGER application_state_archive_deletions
AFTER UPDATE OF state ON application_state
FOR EACH ROW EXECUTE FUNCTION archive_application_state_deletions();

CREATE OR REPLACE FUNCTION archive_announcement_deletion() RETURNS trigger AS $$
DECLARE
  images jsonb;
  entry jsonb;
BEGIN
  IF current_setting('app.skip_trash', true) = 'true' THEN
    RETURN OLD;
  END IF;
  SELECT COALESCE(jsonb_agg(image_url ORDER BY position), '[]'::jsonb)
  INTO images FROM announcement_images WHERE announcement_id = OLD.id;
  entry := jsonb_build_object(
    'id', OLD.id, 'title', OLD.title, 'category', OLD.category,
    'date', COALESCE(OLD.date_label, to_char(OLD.published_on, 'DD Mon YYYY')),
    'author', OLD.author, 'summary', OLD.summary, 'content', OLD.content,
    'images', images, 'image', COALESCE(images ->> 0, ''),
    'isImportant', OLD.is_important, 'createdAt', OLD.created_at
  );
  INSERT INTO deleted_items (item_type, item_id, payload)
  VALUES ('announcements', OLD.id, entry);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS announcements_archive_deletion ON announcements;
CREATE TRIGGER announcements_archive_deletion
BEFORE DELETE ON announcements
FOR EACH ROW EXECUTE FUNCTION archive_announcement_deletion();

CREATE OR REPLACE FUNCTION archive_uploaded_file_deletion() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.skip_trash', true) = 'true' THEN
    RETURN OLD;
  END IF;
  INSERT INTO deleted_items (item_type, item_id, payload)
  VALUES ('uploaded_files', OLD.id, jsonb_build_object(
    'id', OLD.id, 'original_name', OLD.original_name, 'mime_type', OLD.mime_type,
    'size_bytes', OLD.size_bytes, 'content_base64', encode(OLD.content, 'base64')
  ));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS uploaded_files_archive_deletion ON uploaded_files;
CREATE TRIGGER uploaded_files_archive_deletion
BEFORE DELETE ON uploaded_files
FOR EACH ROW EXECUTE FUNCTION archive_uploaded_file_deletion();

INSERT INTO schema_migrations (version, name)
VALUES (5, 'deleted_items_trash')
ON CONFLICT (version) DO NOTHING;

COMMIT;
