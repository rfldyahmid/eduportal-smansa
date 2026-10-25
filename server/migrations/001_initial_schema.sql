BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version integer PRIMARY KEY,
  name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_classes (
  id text PRIMARY KEY,
  name text NOT NULL,
  major text CHECK (major IN ('MIPA', 'IPS', 'Fase E (Umum)')),
  academic_year text,
  homeroom_teacher_id text
);

CREATE TABLE IF NOT EXISTS teachers (
  id text PRIMARY KEY,
  nip text NOT NULL UNIQUE,
  full_name text NOT NULL,
  degree text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  department text NOT NULL CHECK (
    department IN ('MIPA', 'Bahasa', 'IPS', 'Seni & Olahraga', 'BK', 'Informatika')
  ),
  education text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  photo_url text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  homeroom_class_id text REFERENCES school_classes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE school_classes
  DROP CONSTRAINT IF EXISTS school_classes_homeroom_teacher_id_fkey;
ALTER TABLE school_classes
  ADD CONSTRAINT school_classes_homeroom_teacher_id_fkey
  FOREIGN KEY (homeroom_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS students (
  id text PRIMARY KEY,
  nisn text NOT NULL UNIQUE,
  nis text NOT NULL UNIQUE,
  full_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('Laki-laki', 'Perempuan')),
  class_id text NOT NULL REFERENCES school_classes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  major text NOT NULL CHECK (major IN ('MIPA', 'IPS', 'Fase E (Umum)')),
  academic_year text NOT NULL,
  homeroom_teacher_id text REFERENCES teachers(id) ON DELETE SET NULL,
  homeroom_teacher_legacy text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  salt text NOT NULL,
  role text NOT NULL CHECK (role IN ('siswa', 'guru', 'admin', 'kepala_sekolah', 'ketua_kombel')),
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  avatar_url text,
  student_id text UNIQUE REFERENCES students(id) ON DELETE SET NULL,
  teacher_id text REFERENCES teachers(id) ON DELETE SET NULL,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (student_id IS NULL OR teacher_id IS NULL)
);

CREATE TABLE IF NOT EXISTS teacher_classes (
  teacher_id text NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id text NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, class_id)
);

CREATE TABLE IF NOT EXISTS schedules (
  id text PRIMARY KEY,
  day text NOT NULL CHECK (day IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text NOT NULL,
  teacher_id text REFERENCES teachers(id) ON DELETE SET NULL,
  teacher_name_legacy text,
  class_id text NOT NULL REFERENCES school_classes(id) ON UPDATE CASCADE ON DELETE CASCADE,
  room text NOT NULL DEFAULT '',
  color_tag text NOT NULL DEFAULT '',
  updated_at timestamptz,
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS ppdb_applicants (
  id text PRIMARY KEY,
  registration_number text NOT NULL UNIQUE,
  nisn text NOT NULL,
  nik text NOT NULL,
  full_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('Laki-laki', 'Perempuan')),
  birth_place_date text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  previous_school text NOT NULL,
  track text NOT NULL CHECK (
    track IN ('Zonasi', 'Prestasi Akademik', 'Prestasi Non-Akademik', 'Afirmasi', 'Pindah Tugas')
  ),
  average_report_score numeric(5, 2) NOT NULL CHECK (average_report_score BETWEEN 0 AND 100),
  status text NOT NULL CHECK (
    status IN ('Menunggu Verifikasi', 'Berkas Terverifikasi', 'Lulus Seleksi', 'Cadangan', 'Tidak Diterima')
  ),
  registered_at timestamptz NOT NULL,
  committee_notes text
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  message text NOT NULL,
  created_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('Baru', 'Dibaca', 'Dibalas')),
  reply_message text,
  replied_at timestamptz,
  replied_by text
);

CREATE TABLE IF NOT EXISTS contact_info (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  address text NOT NULL,
  phone text NOT NULL,
  whatsapp text NOT NULL,
  public_email text NOT NULL,
  ppdb_email text NOT NULL,
  weekday_hours text NOT NULL,
  friday_hours text NOT NULL,
  footer_hours text NOT NULL,
  instagram_url text NOT NULL,
  facebook_url text NOT NULL,
  youtube_url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('Akademik', 'Prestasi', 'PPDB', 'Kegiatan', 'Umum')),
  published_on date NOT NULL,
  author text NOT NULL,
  summary text NOT NULL,
  content text NOT NULL,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS announcement_images (
  announcement_id text NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  image_url text NOT NULL,
  PRIMARY KEY (announcement_id, position)
);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL CHECK (
    category IN ('Akademik', 'Prestasi', 'Ekstrakurikuler', 'Olahraga', 'Sosialisasi', 'Upacara')
  ),
  published_on date NOT NULL,
  image_url text NOT NULL,
  description text NOT NULL,
  photographer text NOT NULL,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS gallery_photo_images (
  gallery_photo_id text NOT NULL REFERENCES gallery_photos(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  image_url text NOT NULL,
  PRIMARY KEY (gallery_photo_id, position)
);

CREATE TABLE IF NOT EXISTS youtube_videos (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('Kegiatan', 'Prestasi', 'Pembelajaran', 'Profil', 'Umum')),
  youtube_url text NOT NULL,
  video_id text NOT NULL,
  thumbnail_url text NOT NULL,
  description text NOT NULL DEFAULT '',
  published_on date NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS kombel_activities (
  id text PRIMARY KEY,
  title text NOT NULL,
  activity_date date NOT NULL,
  image_url text NOT NULL,
  description text NOT NULL,
  speaker text,
  attendees_count integer CHECK (attendees_count IS NULL OR attendees_count >= 0),
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS kombel_activity_images (
  activity_id text NOT NULL REFERENCES kombel_activities(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  image_url text NOT NULL,
  PRIMARY KEY (activity_id, position)
);

CREATE TABLE IF NOT EXISTS kombel_agendas (
  id text PRIMARY KEY,
  title text NOT NULL,
  agenda_date date NOT NULL,
  agenda_time text NOT NULL,
  location text NOT NULL,
  description text NOT NULL,
  moderator text,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  id text PRIMARY KEY,
  subject text NOT NULL,
  teacher_id text NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  class_id text NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  deadline timestamptz NOT NULL,
  max_score integer NOT NULL CHECK (max_score > 0),
  attachment_name text,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id text PRIMARY KEY,
  assignment_id text NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_nisn text NOT NULL,
  class_id text NOT NULL REFERENCES school_classes(id) ON DELETE RESTRICT,
  submitted_at timestamptz NOT NULL,
  submission_type text NOT NULL CHECK (submission_type IN ('file', 'link', 'text')),
  file_name text,
  file_size text,
  link_or_content text NOT NULL,
  status text NOT NULL CHECK (status IN ('Terkumpul', 'Terlambat', 'Dinilai')),
  score numeric(6, 2),
  feedback text,
  graded_at timestamptz,
  graded_by text,
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS portal_announcements (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('Umum', 'Kelas X', 'Kelas XI', 'Kelas XII')),
  target_class text REFERENCES school_classes(id) ON DELETE CASCADE,
  content text NOT NULL,
  teacher_id text NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  teacher_name_legacy text,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at bigint NOT NULL,
  used boolean NOT NULL DEFAULT false,
  requested_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class_day_time ON schedules(class_id, day, start_time);
CREATE INDEX IF NOT EXISTS idx_ppdb_status_registered ON ppdb_applicants(status, registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_category_date ON gallery_photos(category, published_on);
CREATE INDEX IF NOT EXISTS idx_assignments_class_deadline ON assignments(class_id, deadline);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_portal_announcements_teacher ON portal_announcements(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_expiry ON password_reset_requests(user_id, expires_at);

INSERT INTO schema_migrations (version, name)
VALUES (1, 'initial_schema')
ON CONFLICT (version) DO NOTHING;

COMMIT;
