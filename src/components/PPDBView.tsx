import React, { useState } from 'react';
import { PPDBApplicant, PPDBStatusResult } from '../types';
import { createPPDBApplicant, searchPPDBApplicant } from '../utils/api';
import { getCurrentAcademicYear, getCurrentAcademicYearStart } from '../utils/academicYear';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Calendar,
  Layers,
  Send,
  HelpCircle,
  Printer,
  ChevronRight
} from 'lucide-react';

interface PPDBViewProps {
  onNavigate: (tab: string) => void;
}

export const PPDBView: React.FC<PPDBViewProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'daftar' | 'status'>('info');
  const academicYear = getCurrentAcademicYear();
  const academicYearStart = getCurrentAcademicYearStart();

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    nisn: '',
    nik: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    birthPlaceDate: '',
    phone: '',
    email: '',
    address: '',
    previousSchool: '',
    track: 'Zonasi' as 'Zonasi' | 'Prestasi Akademik' | 'Prestasi Non-Akademik' | 'Afirmasi' | 'Pindah Tugas',
    averageReportScore: '88.5',
    notes: '',
  });

  const [formSubmitted, setFormSubmitted] = useState<PPDBApplicant | null>(null);
  const [formError, setFormError] = useState('');

  // Status Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchNisn, setSearchNisn] = useState('');
  const [searchResult, setSearchResult] = useState<PPDBStatusResult | null>(null);
  const [searchError, setSearchError] = useState('');

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName || !formData.nisn || !formData.previousSchool || !formData.phone) {
      setFormError('Mohon lengkapi seluruh kolom wajib bertanda bintang (*).');
      return;
    }

    if (formData.nisn.length < 10) {
      setFormError('NISN harus terdiri dari minimal 10 digit angka.');
      return;
    }

    try {
      const created = await createPPDBApplicant({
        fullName: formData.fullName,
        nisn: formData.nisn,
        nik: formData.nik || '8202000000000000',
        gender: formData.gender,
        birthPlaceDate: formData.birthPlaceDate || 'Weda, 01 Januari 2011',
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        previousSchool: formData.previousSchool,
        track: formData.track,
        averageReportScore: parseFloat(formData.averageReportScore) || 85
      });
      setFormSubmitted(created);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan pendaftaran PPDB ke server.');
    }
  };

  const handleSearchStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    if (!searchQuery.trim() || !searchNisn.trim()) {
      setSearchError('Masukkan nomor registrasi dan NISN untuk memeriksa status.');
      return;
    }

    try {
      const found = await searchPPDBApplicant(searchQuery.trim(), searchNisn.trim());
      setSearchResult(found);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Status pendaftaran gagal dimuat. Coba lagi nanti.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-16 space-y-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 uppercase tracking-widest">
          <button onClick={() => onNavigate('beranda')} className="hover:underline">Beranda</button>
          <span>/</span>
          <span className="text-slate-500">PPDB Online</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-slate-900">
              Penerimaan Peserta Didik Baru (PPDB) {academicYear}
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1">
              Sistem pendaftaran daring transparan, akuntabel, dan terintegrasi untuk jenjang SMA Negeri 1 Halmahera Tengah.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'info' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Informasi & Jalur
            </button>
            <button
              onClick={() => setActiveTab('daftar')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'daftar' ? 'bg-white text-blue-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Formulir Pendaftaran
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'status' ? 'bg-white text-blue-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cek Status Seleksi
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: INFORMASI & JALUR SELEKSI */}
      {activeTab === 'info' && (
        <div className="space-y-12">
          {/* Jalur Pendaftaran Cards */}
          <div className="space-y-4">
            <h2 className="font-serif-title text-2xl font-bold text-slate-900">
              Pilihan Jalur Penerimaan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase">Jalur Zonasi</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-900 rounded">
                    Kuota 50%
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-base">Zonasi Radius Domisili</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Diperuntukkan bagi calon murid yang berdomisili di dalam wilayah zonasi yang ditetapkan pemerintah berdasarkan jarak titik koordinat rumah ke sekolah.
                </p>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  Syarat: Kartu Keluarga minimal 1 tahun terbit.
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase">Jalur Prestasi</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-50 text-amber-800 rounded">
                    Kuota 30%
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-base">Akademik & Kejuaraan</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Berdasarkan akumulasi rerata nilai rapor semester 1–5 (akademik) atau sertifikat juara perlombaan sains, seni, teknologi, dan olahraga tingkat kota hingga dunia.
                </p>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  Syarat: Rapor min. 85.0 / Sertifikat Juara 1-3.
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Jalur Afirmasi</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded">
                    Kuota 15%
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-base">Keluarga Ekonomi Kurang Mampu</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dikhususkan bagi calon peserta didik dari keluarga ekonomi tidak mampu yang terdaftar dalam program penanganan keluarga miskin pemerintah pusat/daerah.
                </p>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  Syarat: KIP, PKH, atau terdata DTKS resmi.
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 uppercase">Perpindahan Tugas</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-purple-50 text-purple-800 rounded">
                    Kuota 5%
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-base">Mutasi Orang Tua / Wali</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bagi anak dari orang tua yang berpindah tugas kedinasan (TNI, Polri, ASN, BUMN) ke wilayah sekitar sekolah serta anak kandung guru/tenaga kependidikan.
                </p>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  Syarat: Surat Keputusan Mutasi resmi instansi.
                </div>
              </div>
            </div>
          </div>

          {/* Timeline & Jadwal Penting */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <h2 className="font-serif-title text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-900" />
              <span>Jadwal & Tahapan Pelaksanaan PPDB {academicYear}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-mono font-bold text-blue-900">TAHAP 1</span>
                <h4 className="font-semibold text-slate-900 text-sm">Pendaftaran Online</h4>
                <p className="text-xs text-slate-500 font-mono">15 - 28 Oktober {academicYearStart}</p>
                <p className="text-[11px] text-slate-600 pt-1">Pengisian formulir online & unggah berkas kelengkapan.</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-mono font-bold text-amber-700">TAHAP 2</span>
                <h4 className="font-semibold text-slate-900 text-sm">Verifikasi Berkas</h4>
                <p className="text-xs text-slate-500 font-mono">29 Okt - 05 Nov {academicYearStart}</p>
                <p className="text-[11px] text-slate-600 pt-1">Pemeriksaan keaslian sertifikat dan validasi geolokasi KK.</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-mono font-bold text-emerald-700">TAHAP 3</span>
                <h4 className="font-semibold text-slate-900 text-sm">Pengumuman Kelulusan</h4>
                <p className="text-xs text-slate-500 font-mono">10 November {academicYearStart}</p>
                <p className="text-[11px] text-slate-600 pt-1">Hasil seleksi resmi diumumkan serentak di portal ini pukul 10.00 WIT.</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-mono font-bold text-purple-700">TAHAP 4</span>
                <h4 className="font-semibold text-slate-900 text-sm">Daftar Ulang Siswa</h4>
                <p className="text-xs text-slate-500 font-mono">12 - 16 November {academicYearStart}</p>
                <p className="text-[11px] text-slate-600 pt-1">Penyerahan dokumen fisik dan orientasi pengenalan sekolah.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setActiveTab('daftar')}
                className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <span>Buka Formulir Pendaftaran Online Sekarang</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Persyaratan Dokumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-base">Persyaratan Umum</h3>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Telah lulus SMP / MTs sederajat dan memiliki Ijazah atau Surat Keterangan Lulus (SKL).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Berusia maksimal 21 tahun pada tanggal 1 Juli tahun berjalan.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Memiliki Akta Kelahiran dan Kartu Keluarga yang sah dan terdaftar di Dukcapil.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Memiliki Nomor Induk Siswa Nasional (NISN) yang aktif di Dapodik Kemendikbudristek.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-base">Ketentuan Khusus Prestasi</h3>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                  <span>Rapor semester 1 s.d. 5 mata pelajaran Matematika, IPA, B. Indonesia, B. Inggris minimal 85.0.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                  <span>Piagam kejuaraan resmi yang diselenggarakan oleh kementerian, KONI, atau lembaga bereputasi.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                  <span>Sertifikat kejuaraan maksimal berusia 3 tahun sebelum tanggal pendaftaran.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                  <span>Semua calon siswa baru bebas biaya pendaftaran (Gratis / 100% didanai BOS).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FORMULIR PENDAFTARAN SISWA BARU */}
      {activeTab === 'daftar' && (
        <div className="max-w-3xl mx-auto">
          {formSubmitted ? (
            <div className="bg-white border-2 border-emerald-500 rounded-2xl p-8 shadow-xl space-y-6 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">
                  Pendaftaran Berhasil Terkirim
                </span>
                <h2 className="font-serif-title text-2xl font-bold text-slate-900">
                  Selamat, Formulir PPDB Anda Telah Terdaftar!
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Simpan Nomor Registrasi di bawah ini untuk memeriksa status seleksi berkas dan jadwal pengumuman.
                </p>
              </div>

              {/* Registration Slip Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-lg mx-auto text-left space-y-4 font-mono text-xs">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <span className="text-slate-500">Nomor Registrasi PPDB:</span>
                  <span className="text-sm font-bold text-blue-900">{formSubmitted.registrationNumber}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 text-slate-700 min-[375px]:grid-cols-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nama Siswa:</span>
                    <span className="font-sans font-semibold">{formSubmitted.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">NISN:</span>
                    <span>{formSubmitted.nisn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Asal Sekolah:</span>
                    <span className="font-sans">{formSubmitted.previousSchool}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Pilihan Jalur:</span>
                    <span className="font-sans font-semibold text-amber-700">{formSubmitted.track}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Rata-rata Rapor:</span>
                    <span>{formSubmitted.averageReportScore}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Waktu Daftar:</span>
                    <span className="text-[11px]">{formSubmitted.registeredAt}</span>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-2 flex items-center gap-2 text-emerald-700 font-sans text-xs">
                  <Clock className="w-4 h-4" />
                  <span>Status Terkini: <strong>{formSubmitted.status}</strong></span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Bukti Pendaftaran</span>
                </button>
                <button
                  onClick={() => {
                    setSearchQuery(formSubmitted.registrationNumber);
                    setActiveTab('status');
                  }}
                  className="px-5 py-2.5 bg-blue-900 text-white rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-blue-800 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  <span>Pantau Status Seleksi</span>
                </button>
                <button
                  onClick={() => {
                    setFormSubmitted(null);
                    setFormData({
                      fullName: '',
                      nisn: '',
                      nik: '',
                      gender: 'Laki-laki',
                      birthPlaceDate: '',
                      phone: '',
                      email: '',
                      address: '',
                      previousSchool: '',
                      track: 'Zonasi',
                      averageReportScore: '88.5',
                      notes: '',
                    });
                  }}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-medium"
                >
                  Daftarkan Siswa Lain
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="font-serif-title text-2xl font-bold text-slate-900">
                  Formulir Pendaftaran Siswa Baru
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pastikan data yang diisikan sesuai dengan dokumen kependudukan resmi dan rapor SMP/MTs.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-6">
                {/* Bagian 1: Data Pribadi */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    1. Identitas Calon Peserta Didik
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Nama Lengkap Sesuai Ijazah SMP <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Muhammad Farhan Pratama"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        NISN (10 Digit) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        placeholder="Contoh: 0081234567"
                        value={formData.nisn}
                        onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        NIK (Nomor Induk Kependudukan)
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        placeholder="16 Digit NIK di Kartu Keluarga"
                        value={formData.nik}
                        onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Jenis Kelamin <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none bg-white"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Tempat, Tanggal Lahir
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Weda, 14 Mei 2011"
                        value={formData.birthPlaceDate}
                        onChange={(e) => setFormData({ ...formData, birthPlaceDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Nomor HP / WhatsApp Aktif <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="081234567890"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Alamat Email Siswa / Orang Tua
                      </label>
                      <input
                        type="email"
                        placeholder="contoh@gmail.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Alamat Domisili Lengkap (Sesuai Kartu Keluarga)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Jl. Siswa No. 12, Desa Were, Kec. Weda, Kab. Halmahera Tengah"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 2: Asal Sekolah & Nilai */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    2. Riwayat Pendidikan & Prestasi
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Nama SMP / MTs Asal <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: SMP Negeri 1 Weda / MTs Halmahera Tengah"
                        value={formData.previousSchool}
                        onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Rerata Nilai Rapor Semester 1 - 5 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="70"
                        max="100"
                        required
                        value={formData.averageReportScore}
                        onChange={(e) => setFormData({ ...formData, averageReportScore: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Pilihan Jalur Pendaftaran <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.track}
                        onChange={(e) => setFormData({ ...formData, track: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none bg-white font-medium"
                      >
                        <option value="Zonasi">Jalur Zonasi Domisili (Jarak Tempat Tinggal)</option>
                        <option value="Prestasi Akademik">Jalur Prestasi Akademik (Nilai Rapor)</option>
                        <option value="Prestasi Non-Akademik">Jalur Prestasi Non-Akademik (Piagam/Kejuaraan)</option>
                        <option value="Afirmasi">Jalur Afirmasi (KIP / PKH / DTKS)</option>
                        <option value="Pindah Tugas">Jalur Perpindahan Tugas Orang Tua / Anak Pendidik</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Keterangan Tambahan / Prestasi yang Pernah Diraih
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Contoh: Juara 1 Olimpiade Matematika Tingkat Kota, Sertifikat Kejurda Taekwondo, dsb."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Dengan mengirimkan formulir, Anda menyatakan seluruh data adalah benar.
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim Formulir Pendaftaran</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CEK STATUS SELEKSI BERKAS */}
      {activeTab === 'status' && (
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-center">
            <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif-title text-2xl font-bold text-slate-900">
                Pencarian Status Pendaftaran PPDB
              </h2>
              <p className="text-xs text-slate-500">
                Untuk menjaga kerahasiaan data, masukkan nomor registrasi dan NISN yang tercantum pada bukti pendaftaran.
              </p>
            </div>

            <form onSubmit={handleSearchStatus} className="mx-auto grid max-w-md grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                required
                autoComplete="off"
                placeholder="Nomor registrasi"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 px-3 py-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
              />
              <input
                type="text"
                inputMode="numeric"
                required
                autoComplete="off"
                maxLength={20}
                placeholder="NISN"
                value={searchNisn}
                onChange={(e) => setSearchNisn(e.target.value.replace(/\D/g, ''))}
                className="min-w-0 px-3 py-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
              >
                Cari Status
              </button>
            </form>

          </div>

          {/* Search Result Display */}
          {searchError && (
            <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center space-y-1">
              <p className="font-semibold">Status belum dapat ditampilkan</p>
              <p className="text-amber-700">{searchError}</p>
            </div>
          )}

          {searchResult && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[11px] font-mono text-slate-500">Hasil Verifikasi PPDB</span>
                  <h3 className="font-bold text-slate-900 text-lg">Status Pendaftaran</h3>
                </div>
                <div className="self-start sm:self-auto">
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${
                    searchResult.status === 'Lulus Seleksi'
                      ? 'bg-emerald-100 text-emerald-800'
                      : searchResult.status === 'Berkas Terverifikasi'
                      ? 'bg-blue-100 text-blue-800'
                      : searchResult.status === 'Cadangan'
                      ? 'bg-amber-100 text-amber-800'
                      : searchResult.status === 'Tidak Diterima'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {searchResult.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <p><span className="text-slate-500">Nomor registrasi: </span><strong className="font-mono text-blue-900">{searchResult.registrationNumber}</strong></p>
                <p><span className="text-slate-500">Tanggal pendaftaran: </span><strong className="text-slate-800">{searchResult.registeredAt}</strong></p>
                <div className="rounded-lg bg-blue-50 p-3 text-blue-900">Detail pendaftar hanya dapat dilihat melalui portal panitia PPDB.</div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Panitia PPDB SMAN 1 Halmahera Tengah</span>
                <button
                  onClick={() => window.print()}
                  className="text-blue-900 hover:underline font-semibold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Lembar Status</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
