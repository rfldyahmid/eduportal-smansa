-- 002_review_fixes.sql
-- Perbaikan atas 001_initial_schema.sql setelah dicocokkan dengan server.ts dan data seed db.ts.
-- Jalankan SETELAH 001. Jika 001 belum pernah dipakai di server mana pun, isi file ini
-- boleh digabung ke 001.

BEGIN;

-- 1. Kolom isImportant dipakai server.ts pada pengumuman sekolah dan pengumuman portal,
--    tetapi belum ada di tabel pada 001.
ALTER TABLE announcements        ADD COLUMN IF NOT EXISTS is_important boolean NOT NULL DEFAULT false;
ALTER TABLE portal_announcements ADD COLUMN IF NOT EXISTS is_important boolean NOT NULL DEFAULT false;

-- 2. Tanggal tampilan lama ('28 September 2026', 'Sabtu, 24 Oktober 2026') disimpan apa adanya.
--    Kolom tanggal bertipe date tetap dipakai untuk pengurutan, tetapi teks aslinya tidak hilang
--    kalau form admin mengisi tanggal dengan format bebas.
ALTER TABLE announcements     ADD COLUMN IF NOT EXISTS date_label text;
ALTER TABLE gallery_photos    ADD COLUMN IF NOT EXISTS date_label text;
ALTER TABLE youtube_videos    ADD COLUMN IF NOT EXISTS date_label text;
ALTER TABLE kombel_activities ADD COLUMN IF NOT EXISTS date_label text;
ALTER TABLE kombel_agendas    ADD COLUMN IF NOT EXISTS date_label text;

-- 3. Nomor pendaftaran PPDB: server.ts memakai angka acak 4 digit (1000-9999). Dengan ratusan
--    pendaftar tabrakan nomor hampir pasti terjadi, dan UNIQUE akan menolak pendaftar berikutnya.
--    Sequence ini dipakai untuk membuat nomor berurutan: 'PPDB-2026-' || lpad(nextval(...)::text, 4, '0').
CREATE SEQUENCE IF NOT EXISTS ppdb_registration_seq;

-- 4. Wali kelas disimpan di dua tempat (school_classes.homeroom_teacher_id dan
--    teachers.homeroom_class_id) sehingga bisa saling bertentangan. Sisakan satu sumber:
--    teachers.homeroom_class_id, dengan satu wali kelas per kelas (sama seperti aturan 409 di server.ts).
ALTER TABLE school_classes DROP COLUMN IF EXISTS homeroom_teacher_id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_teachers_homeroom_class
  ON teachers (homeroom_class_id) WHERE homeroom_class_id IS NOT NULL;

-- 5. Login membandingkan username dan email tanpa membedakan huruf besar/kecil
--    (server.ts: toLowerCase()), sehingga keunikan juga harus tanpa membedakan huruf besar/kecil.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower    ON users (lower(email)) WHERE email <> '';

-- 6. Waktu kedaluwarsa token reset: dari epoch milidetik (bigint) menjadi timestamptz,
--    sama seperti kolom waktu lainnya.
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'password_reset_requests' AND column_name = 'expires_at') = 'bigint' THEN
    ALTER TABLE password_reset_requests
      ALTER COLUMN expires_at TYPE timestamptz USING to_timestamp(expires_at / 1000.0);
  END IF;
END $$;

-- 7. Indeks untuk pencarian yang dipakai aplikasi.
CREATE INDEX IF NOT EXISTS idx_users_teacher_id ON users(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_nisn        ON ppdb_applicants(nisn);

INSERT INTO schema_migrations (version, name)
VALUES (2, 'review_fixes')
ON CONFLICT (version) DO NOTHING;

COMMIT;
