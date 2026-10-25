# Rencana Migrasi PostgreSQL

Dokumen ini mencatat audit, konfigurasi, dan batasan migrasi PostgreSQL. Runtime menggunakan PostgreSQL: endpoint aplikasi membaca/menulis state melalui `server/db.ts`, sedangkan pengumuman publik memakai tabel relasional. File `server/migrations/001_initial_schema.sql` adalah skema awal; migrator memeriksa versi dan hanya menerapkan migrasi yang belum tercatat.

## Status aktual lingkungan lokal (21 Oktober 2026)

- Service PostgreSQL lokal `postgresql-x64-18` berjalan dan koneksi melalui `DATABASE_URL` pada `.env` berhasil diuji. Nilai `.env` tidak dicatat di dokumen ini.
- Database memiliki migrasi skema versi 1, 2, dan 3. Versi 3 membuat `application_state`, tempat runtime menyimpan seluruh state aplikasi sebagai satu dokumen JSONB di PostgreSQL.
- Rekonsiliasi ID terhadap `data/db.json` awalnya menemukan satu pengumuman yang hanya ada di JSON. Pengumuman beserta tiga referensi gambarnya sudah diimpor ke PostgreSQL; ID pengumuman, pengguna, guru, dan siswa kini cocok dengan sumber JSON yang diperiksa.
- Bootstrap satu kali ke `application_state` berhasil. Sumber JSON tidak diubah; runtime server tidak lagi membaca atau menulis `data/db.json`. File itu hanya menjadi sumber bootstrap/migrasi dan cadangan lama.
- Seluruh endpoint backend yang memakai `getDb()`/`saveDb()` kini membaca dan menulis state ke PostgreSQL. Pengumuman juga memakai tabel relasional `announcements`/`announcement_images`; server memuat koleksi ini dari tabel relasional saat startup.
- `npm run db:verify` berhasil: PostgreSQL tersambung, semua 15 koleksi tersedia, dan perubahan uji tulis-baca-pulihkan ditemukan pada baris PostgreSQL lalu dipulihkan. Data uji tidak tertinggal.
- Server memeriksa koneksi PostgreSQL saat startup, dan gagal dengan pesan jelas jika `DATABASE_URL` tidak tersedia. Saat `NODE_ENV=production`, server mensyaratkan `ADMIN_SECRET` atau `JWT_SECRET` minimal 32 karakter.
- `npm run lint` dan `npm run build` berhasil. Build masih memberi peringatan bahwa chunk frontend melebihi 500 kB; ini bukan kegagalan.
- **Batas arsitektur:** koleksi selain pengumuman saat ini disimpan sebagai JSONB dalam satu baris PostgreSQL (`application_state`), bukan dinormalisasi ke tabel relasional per koleksi. Untuk skala satu instans aplikasi dengan trafik sekolah awal, ini memberikan persistensi database, tetapi bukan desain final terbaik untuk konkurensi multi-instans atau analitik. Constraint relasional pada tabel yang sudah ada belum dijalankan untuk semua operasi runtime.
- **Belum siap untuk penggunaan nyata/hosting publik:** perlu uji end-to-end fitur dengan akun sekolah, ubah kredensial demo/default dan secret, backup-restore staging, serta pindahkan unggahan dari `data/uploads/` ke persistent disk/object storage. Jalankan hanya satu instans aplikasi sampai state adapter multi-writer/normalisasi selesai.
- `psql` tidak tersedia di PATH lokal. Koneksi dapat diperiksa dengan `npx tsx tes-db.ts`; ini hanya menguji koneksi dan menghitung akun, bukan menguji semua endpoint PostgreSQL.

## Menjalankan dan memverifikasi koneksi

Pastikan `.env` di server berisi `DATABASE_URL` PostgreSQL yang sudah dibuat (jangan kirim atau commit nilai rahasia). Pada Windows, jalankan dari folder proyek:

```powershell
npm run db:migrate
npm run db:verify
npm run dev
```

`npm run db:bootstrap` hanya diperlukan satu kali untuk database kosong yang skemanya sudah dimigrasikan dan memiliki `data/db.json`. Perintah ini menolak menimpa `application_state` yang sudah ada; jangan hapus baris itu untuk mengulang bootstrap. Untuk deploy:

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

Tetapkan `DATABASE_URL` dan `ADMIN_SECRET` di environment VPS/layanan hosting (secret minimal 32 karakter); jangan masukkan ke frontend, Git, atau chat. `/api/health` menampilkan `database: PostgreSQL`. Uji `npm run db:verify` ketika server sedang dihentikan agar penulisan verifikasi tidak berbenturan dengan proses aplikasi.

Untuk data sekolah, buat backup database dan uji restore sebelum cutover; jangan gunakan berkas JSON lama sebagai target runtime. Simpan arsip JSON dan unggahan sebagai backup terlindungi sampai hasil verifikasi resmi disetujui pihak sekolah.

## Hasil audit awal (snapshot sumber JSON)

Pemeriksaan lokal dilakukan pada 21 Oktober 2026. Pemeriksaan hanya menghitung baris, ID, dan kecocokan relasi; nilai pribadi tidak disalin ke laporan.

| Koleksi di `data/db.json` | Baris |
| --- | ---: |
| users | 7 |
| students | 4 |
| teachers | 9 |
| schedules | 9 |
| ppdb | 2 |
| messages | 2 |
| announcements | 6 |
| gallery | 7 |
| videos | 1 |
| kombelActivities | 3 |
| kombelAgendas | 2 |
| assignments | 1 |
| submissions | 1 |
| portalAnnouncements | 0 |
| passwordResets | 0 |

- Tidak ditemukan ID duplikat pada koleksi yang memiliki ID.
- Tidak ditemukan nilai duplikat pada NISN/NIS siswa, NIP guru, nomor pendaftaran, NISN PPDB, atau NIK PPDB di snapshot saat audit. Aturan unik PPDB tetap perlu dipastikan sebelum dibuat karena kebijakan pendaftaran ulang belum ditentukan.
- Seluruh referensi akun ke profil siswa/guru, jadwal ke guru, tugas ke guru, serta pengumpulan ke tugas/siswa pada data yang diperiksa memiliki target.
- Ada satu nama wali kelas pada data siswa yang tidak cocok dengan nama guru yang ada. Pertahankan teks aslinya dan verifikasi manual sebelum mengisi relasi `homeroom_teacher_id`.
- `data/db.json` belum menyimpan `contactInfo`; kode backend saat ini menyediakan nilai awal bawaan. Migrasi harus menambahkan satu baris pengaturan kontak bawaan.
- `data/content.json` berisi data konten lama. Jika `data/db.json` tersedia, itulah sumber data aktif. Jangan gabungkan kedua file otomatis tanpa aturan deduplikasi.

## Rancangan relasi

- `users` terhubung opsional ke `students` atau `teachers`; kata sandi tetap berupa hash dan salt, bukan kata sandi asli.
- `school_classes` menjadi referensi bagi siswa, jadwal, tugas, pengumpulan, pengumuman kelas, dan daftar kelas yang diajar guru. `teacher_classes` menggantikan array kelas pada profil guru.
- `ppdb_applicants` disimpan terpisah dari `students`: pendaftar belum tentu diterima sebagai siswa.
- `announcements`, `gallery_photos`, dan `kombel_activities` menyimpan gambar tambahan pada tabel relasi berurutan, bukan array kolom.
- Berkas unggahan tetap berada di penyimpanan file/object storage; PostgreSQL menyimpan path/URL saja.
- `contact_info` adalah satu baris pengaturan publik. Endpoint baca bersifat publik dan endpoint perubahan dibatasi untuk admin.
- `password_reset_requests.token_hash` dirancang untuk menyimpan hash token. Endpoint pemulihan kata sandi perlu disesuaikan saat migrasi; token mentah tidak boleh dimasukkan ke kolom tersebut.
- Pengumpulan tugas mengikuti perilaku aplikasi sekarang: satu pengumpulan aktif per tugas dan siswa, yang diperbarui saat dikirim ulang.

## Catatan migrasi historis dan tahap lanjutan

1. Cadangkan `data/db.json`, `data/content.json`, `data/uploads/`, dan database PostgreSQL ke lokasi aman di luar folder yang dipublikasikan.
2. Sebelum hosting publik, siapkan staging PostgreSQL, kredensial/secret produksi, backup terjadwal, dan uji pemulihan backup.
3. Uji semua alur end-to-end dengan akun sekolah dan pastikan proses deployment mempertahankan unggahan pada `data/uploads/` atau object storage.
4. Pertahankan satu instans aplikasi selama state selain pengumuman masih berada dalam satu dokumen JSONB; rancang normalisasi dan dukungan multi-writer sebelum menjalankan beberapa instans.

## Catatan sebelum implementasi berikutnya

- SQL awal memakai ID teks agar ID lama tetap dapat dipertahankan.
- Beberapa tanggal lama adalah teks berformat lokal, bukan ISO. Migrator harus mengubahnya secara eksplisit ke `date`/`timestamptz` menggunakan zona `Asia/Jayapura` dan mencatat baris yang gagal; jangan mengandalkan parsing tanggal otomatis.
- Kolom berakhiran `_legacy` mempertahankan nilai tampilan lama selama relasi dinormalisasi.
- SQL skema lokal tercatat telah diterapkan pada versi migrasi 1, 2, dan 3. `psql` tidak tersedia di PATH; migrasi dan pemeriksaan memakai koneksi Node `pg`. Jalankan migrasi terkontrol pada database staging sebelum deployment.
- Kredensial koneksi PostgreSQL harus berada di environment server, bukan source control atau frontend.
