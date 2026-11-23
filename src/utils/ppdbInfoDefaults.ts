import type { PpdbWebsiteInfo } from '../types';

export const DEFAULT_PPDB_WEBSITE_INFO: PpdbWebsiteInfo = {
  introduction: 'Sistem pendaftaran daring transparan, akuntabel, dan terintegrasi untuk jenjang SMA Negeri 1 Halmahera Tengah.',
  paths: [
    {
      label: 'Jalur Zonasi', title: 'Zonasi Radius Domisili', quota: '50%',
      description: 'Diperuntukkan bagi calon murid yang berdomisili di dalam wilayah zonasi yang ditetapkan pemerintah berdasarkan jarak titik koordinat rumah ke sekolah.',
      requirement: 'Kartu Keluarga minimal 1 tahun terbit.'
    },
    {
      label: 'Jalur Prestasi', title: 'Akademik & Kejuaraan', quota: '30%',
      description: 'Berdasarkan akumulasi rerata nilai rapor semester 1–5 (akademik) atau sertifikat juara perlombaan sains, seni, teknologi, dan olahraga tingkat kota hingga dunia.',
      requirement: 'Rapor min. 85.0 / Sertifikat Juara 1–3.'
    },
    {
      label: 'Jalur Afirmasi', title: 'Keluarga Ekonomi Kurang Mampu', quota: '15%',
      description: 'Dikhususkan bagi calon peserta didik dari keluarga ekonomi tidak mampu yang terdaftar dalam program penanganan keluarga miskin pemerintah pusat/daerah.',
      requirement: 'KIP, PKH, atau terdata DTKS resmi.'
    },
    {
      label: 'Perpindahan Tugas', title: 'Mutasi Orang Tua / Wali', quota: '5%',
      description: 'Bagi anak dari orang tua yang berpindah tugas kedinasan (TNI, Polri, ASN, BUMN) ke wilayah sekitar sekolah serta anak kandung guru/tenaga kependidikan.',
      requirement: 'Surat Keputusan Mutasi resmi instansi.'
    }
  ],
  stages: [
    { label: 'TAHAP 1', title: 'Pendaftaran Online', date: '15 - 28 Oktober {tahun}', description: 'Pengisian formulir online & unggah berkas kelengkapan.' },
    { label: 'TAHAP 2', title: 'Verifikasi Berkas', date: '29 Okt - 05 Nov {tahun}', description: 'Pemeriksaan keaslian sertifikat dan validasi geolokasi KK.' },
    { label: 'TAHAP 3', title: 'Pengumuman Kelulusan', date: '10 November {tahun}', description: 'Hasil seleksi resmi diumumkan serentak di portal ini pukul 10.00 WIT.' },
    { label: 'TAHAP 4', title: 'Daftar Ulang Siswa', date: '12 - 16 November {tahun}', description: 'Penyerahan dokumen fisik dan orientasi pengenalan sekolah.' }
  ]
};
