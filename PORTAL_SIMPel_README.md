# Perubahan Portal Versi Simpel

Portal kini difokuskan pada 3 fungsi:
1. Jadwal Mata Pelajaran
2. Tugas
3. Pengumuman Portal Internal

Guru dapat mengelola ketiganya. Siswa hanya melihat data yang sesuai kelasnya.

Pengumuman portal disimpan pada storage terpisah dari pengumuman website publik:
- `PORTAL_ANNOUNCEMENTS`
- kategori: Umum, Kelas X, Kelas XI, Kelas XII

Jadwal siswa tersedia Senin-Sabtu.

Data portal (jadwal, tugas, pengumpulan, dan pengumuman internal) dibaca dan ditulis melalui API backend ke PostgreSQL. `localStorage` masih dipakai untuk sesi/token, preferensi, notifikasi lokal, serta data fallback ketika API tidak tersedia. Jalankan portal lewat server (`npm run dev`); jangan mengandalkan fallback lokal untuk operasional sekolah karena perubahan tersebut tidak tersinkron antarkomputer.
