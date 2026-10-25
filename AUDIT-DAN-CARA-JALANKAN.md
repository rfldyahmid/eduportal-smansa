# EDUPORTAL — Hasil Audit Awal dan Cara Menjalankan

## Perbaikan yang diterapkan
1. Memindahkan fallback SPA `index.html` ke bagian paling akhir `server.ts`. Sebelumnya fallback dipasang sebelum route `/api`, sehingga permintaan API bisa menerima HTML `index.html` dengan status 200, bukan JSON.
2. Menambahkan pemeriksaan respons pada `fetchAnnouncements()` agar respons bukan-array tidak diteruskan ke React sebagai daftar pengumuman.
3. Memperbaiki `getStoredAnnouncements()` agar nilai localStorage yang rusak/tidak berbentuk array tidak membuat halaman crash saat komponen menjalankan `[...announcements]`.
4. Menghapus `.env`, `server.js`, `npm-error.txt`, `node_modules`, dan `dist` dari paket perbaikan. `.env` dapat berisi rahasia; `node_modules` harus dipasang ulang di komputer pengguna.

## Cara menjalankan di Windows
1. Ekstrak ZIP ini ke folder baru, misalnya `D:\EDUPORTAL-repaired`.
2. Buka folder tersebut di VS Code.
3. Buka Terminal > New Terminal, pastikan terminal berada di folder proyek.
4. Jalankan:
   ```bat
   npm ci
   ```
   Tunggu sampai instalasi selesai. Ini memasang dependency sesuai `package-lock.json` dan mengganti `node_modules` lama yang mungkin tidak cocok.
5. Jalankan:
   ```bat
   npm run dev
   ```
6. Buka alamat yang muncul di terminal, biasanya `http://localhost:3000`.

Jika `npm ci` gagal, simpan pesan error lengkap dari terminal. Jangan langsung memakai `--force`; konflik dependency perlu dilihat dulu.

## Pemeriksaan yang dilakukan
- `npm run lint` / TypeScript `tsc --noEmit`: berhasil pada salinan proyek yang diperiksa.
- Build Vite tidak berhasil diverifikasi di lingkungan pemeriksaan ini karena arsip membawa `node_modules` Windows yang tidak memiliki native binding Linux. Karena itu dependency sengaja tidak disertakan; lakukan `npm ci` di Windows lalu coba `npm run build`.
- Ini audit statis dan perbaikan terhadap masalah yang terlihat, bukan jaminan semua fitur telah diuji end-to-end. Setelah server tampil, uji halaman utama, menu, login, pengumuman, galeri, PPDB, portal siswa/guru, unggah dan pengumpulan tugas.

## Rekomendasi database
Untuk portal sekolah yang akan dipakai banyak siswa dan guru, rekomendasi utama adalah **PostgreSQL** dengan **Prisma ORM**. Data siswa, guru, kelas, jadwal, tugas, pengumpulan tugas, nilai, akun, dan PPDB memiliki relasi yang lebih aman dikelola dalam database relasional daripada file JSON.

- **Tahap lokal/pengembangan:** PostgreSQL lokal atau Docker.
- **Tahap online/produksi:** PostgreSQL terkelola dari penyedia hosting yang dipilih sekolah; siapkan backup, kontrol akses, dan kebijakan privasi.
- `data/db.json` saat ini adalah penyimpanan berbasis file JSON, bukan database relasional. Ia dapat membantu prototipe, tetapi kurang cocok untuk penggunaan bersamaan dan data sekolah penting.
- Jangan memasukkan data siswa asli sebelum autentikasi, izin per peran, validasi server, backup, dan pengamanan rahasia ditinjau.
- File `.env` tidak disertakan. Jika diperlukan, salin `.env.example` menjadi `.env` dan isi nilai lokal yang sesuai. Ganti semua kata sandi/secret bawaan sebelum penggunaan nyata.

## Catatan keamanan penting
Kode saat ini membuat akun contoh dan kata sandi bawaan pada inisialisasi database JSON (contohnya pola seperti `admin123`, `guru123`, `siswa123`). Jangan gunakan konfigurasi bawaan itu untuk situs publik. Atur kredensial unik melalui konfigurasi yang aman dan ubah logika seed sebelum dipakai sekolah.
