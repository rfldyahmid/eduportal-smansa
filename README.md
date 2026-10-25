# EDUPORTAL — SMA Negeri 1 Halmahera Tengah

## Penyimpanan data

Backend menyimpan data aplikasi ke PostgreSQL melalui `DATABASE_URL` pada environment server. Sebagian besar koleksi berada dalam `application_state` (JSONB), pengumuman publik memakai tabel relasional, dan isi file unggahan berada dalam tabel `uploaded_files`. `data/db.json` adalah sumber bootstrap/cadangan lama, bukan penyimpanan runtime.

Frontend masih menggunakan `localStorage` untuk preferensi tampilan dan sesi/token, serta menyediakan data lokal sebagai fallback jika API gagal. Karena itu, gunakan aplikasi melalui backend (`npm run dev`), bukan membuka `index.html` langsung. Rincian setup dan batasan migrasi ada di [DATABASE-MIGRATION.md](DATABASE-MIGRATION.md).

## Fitur konten publik yang sudah terhubung backend

### Pengumuman / Berita
- Admin dapat membuat, mengedit, dan menghapus pengumuman.
- Pengumuman dapat memiliki gambar.
- Saat **Selengkapnya** diklik, gambar tampil bersama isi berita.
- 6 pengumuman terbaru tampil di halaman utama.
- Pengumuman yang lebih lama otomatis masuk **Arsip Pengumuman & Berita** dan tetap dapat dibaca.

### Galeri
Galeri menjadi arsip foto berdasarkan kategori:
- Akademik
- Prestasi
- Ekstrakurikuler
- Olahraga
- Sosialisasi
- Upacara

Satu kategori dapat memiliki banyak foto. Admin dapat mengunggah beberapa foto sekaligus.

### Backend
Data pengumuman dan isi unggahan baru disimpan di PostgreSQL. Saat backend dimulai, file lama di `data/uploads/` disalin ke tabel `uploaded_files` tanpa mengubah URL-nya. Jalankan `npm run db:migrate` sebelum menjalankan versi backend ini agar tabel unggahan dibuat.

API:
- `GET /api/announcements`
- `POST/PUT/DELETE /api/announcements`
- `GET /api/gallery`
- `POST/DELETE /api/gallery`
- `POST /api/admin/login`
- `GET /api/health`

## Menjalankan di Windows

Pastikan Node.js LTS sudah terpasang.

```bash
npm install
npm run dev
```

Kemudian buka:

```text
http://localhost:3000
```

Jangan menggunakan Live Server pada `index.html`. Jalankan melalui `npm run dev` karena Express backend dan Vite frontend dijalankan bersama.

Untuk hosting nyata, akun pengguna harus sudah dikelola di PostgreSQL. Jangan memakai kata sandi contoh atau menyimpan kredensial akun di README. Atur environment backend berikut pada penyedia hosting:

```env
PORT=3000
NODE_ENV=production
ADMIN_SECRET=SECRET_ACAK_MINIMAL_32_KARAKTER
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/NAMA_DATABASE
```

`ADMIN_USERNAME` dan `ADMIN_PASSWORD` bukan pengaturan runtime aplikasi. Sebelum cutover, pastikan akun admin PostgreSQL memakai kata sandi unik dan aman; kata sandi akun yang ditandai untuk diganti akan diwajibkan berubah saat login.

Saat admin menambahkan siswa atau guru, akun portal dibuat otomatis dengan username NISN/NIP dan kata sandi sementara yang hanya ditampilkan sekali. Email aktif wajib dicatat untuk pemulihan mandiri; siswa dapat memakai email orang tua/wali. Akun dan status kata sandinya tersedia di menu **Kelola Akun & Sandi**. Untuk akun lama, perbarui email melalui edit data siswa/guru agar pemulihan email dapat dipakai.

### Mengaktifkan balasan email untuk pesan kontak

Admin dapat membalas pesan dari menu **Pesan Aspirasi Humas**. Balasan dikirim ke alamat email pengirim menggunakan SMTP. Tambahkan konfigurasi penyedia email ke file `.env` di server (jangan masukkan kata sandi SMTP ke kode atau kirim melalui chat):

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=akun-pengirim@example.com
SMTP_PASSWORD=KATA_SANDI_ATAU_APP_PASSWORD
SMTP_FROM_EMAIL=akun-pengirim@example.com
SMTP_FROM_NAME=SMA Negeri 1 Halmahera Tengah
```

Konfigurasi SMTP yang sama dipakai untuk mengirim token pemulihan kata sandi. Token tidak ditampilkan ke browser; pemulihan email merespons `503` sampai konfigurasi SMTP lengkap. Token hanya berlaku 30 menit dan dapat dipakai sekali. Jika pengguna tidak punya akses ke email akun, admin dapat menerbitkan kata sandi sementara dari menu **Kelola Akun & Sandi**; pengguna wajib menggantinya setelah login.

Gunakan host, port, dan kata sandi aplikasi yang diberikan penyedia email. Port 465 umumnya memakai `SMTP_SECURE=true`; port 587 umumnya memakai `SMTP_SECURE=false`. Restart server setelah mengubah `.env`. Jika pengaturan SMTP belum lengkap atau pengiriman gagal, admin akan menerima pesan kesalahan dan balasan tidak akan ditandai terkirim.

### Mengubah informasi kontak website

Admin dapat membuka menu **Info Kontak** di portal admin untuk mengubah alamat, nomor telepon dan WhatsApp, email, jam pelayanan, serta tautan media sosial. Perubahan disimpan di PostgreSQL dan ditampilkan pada halaman Kontak serta footer.

API:
- `GET /api/contact-info` (publik)
- `PUT /api/contact-info` (admin)

## Membuka dari HP / komputer lain dalam jaringan yang sama

Server sudah menggunakan `0.0.0.0`. Setelah `npm run dev`, cari IPv4 komputer server, misalnya:

```text
192.168.1.10
```

Perangkat lain dapat membuka:

```text
http://192.168.1.10:3000
```

Jika Windows Firewall bertanya, izinkan Node.js pada jaringan yang digunakan.

Untuk website yang benar-benar online, backend harus ditempatkan pada server hosting/VPS yang dapat diakses internet. PostgreSQL harus tersedia dari backend, dan `data/uploads/` harus menggunakan penyimpanan persisten agar foto tidak hilang saat server restart/deploy.
