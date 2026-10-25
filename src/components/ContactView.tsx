import React, { useState } from 'react';
import { ContactMessage } from '../types';
import { sendContactMessage } from '../utils/api';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  MessageSquare,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import { SchoolSocialLinks, WhatsAppMark } from './SchoolSocialLinks';
import { useContactInfo } from '../utils/contactInfo';
import { getCurrentAcademicYear } from '../utils/academicYear';

interface ContactViewProps {
  onNavigate: (tab: string) => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onNavigate }) => {
  const academicYear = getCurrentAcademicYear();
  const contactInfo = useContactInfo();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setIsSending(true);
    setSendError('');

    try {
      await sendContactMessage(formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err: any) {
      setSendError(err?.message || 'Gagal mengirim pesan. Silakan coba lagi.');
    } finally {
      setIsSending(false);
    }
  };

  const faqs = [
    {
      q: 'Apakah sekolah ini memungut biaya Sumbangan Pembinaan Pendidikan (SPP)?',
      a: 'Sebagai Sekolah Menengah Atas Negeri di bawah naungan Dinas Pendidikan dan Kebudayaan Provinsi Maluku Utara, SMA Negeri 1 Halmahera Tengah tidak memungut biaya SPP bulanan bagi seluruh peserta didik. Seluruh operasional pendidikan dibiayai melalui Bantuan Operasional Sekolah (BOS) reguler dan daerah.'
    },
    {
      q: 'Bagaimana cara mendaftar akun di Portal Akademik Siswa atau Guru?',
      a: 'Akun portal akademik siswa diterbitkan secara otomatis oleh staf Tata Usaha & IT saat siswa dinyatakan resmi diterima (menggunakan NISN sebagai username). Untuk Bapak/Ibu guru, akun didaftarkan melalui nomor NIP resmi.'
    },
    {
      q: 'Apakah siswa dari luar daerah atau provinsi dapat mendaftar PPDB?',
      a: 'Bisa. Calon peserta didik dari luar daerah dapat mendaftar melalui Jalur Prestasi (Akademik maupun Non-Akademik) atau Jalur Perpindahan Tugas Orang Tua dengan melampirkan surat rekomendasi penyaluran dari Dinas Pendidikan asal.'
    },
    {
      q: 'Apakah tersedia program beasiswa untuk studi lanjut ke perguruan tinggi?',
      a: 'Ya. Tim Bimbingan Konseling (BK) memfasilitasi pendampingan beasiswa seperti KIP-Kuliah, Beasiswa Indonesia Maju (BIM) Puspresnas, Beasiswa Prestasi Unggulan, serta persiapan beasiswa universitas luar negeri.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-16 space-y-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 uppercase tracking-widest">
          <button onClick={() => onNavigate('beranda')} className="hover:underline">Beranda</button>
          <span>/</span>
          <span className="text-slate-500">Pusat Informasi</span>
        </div>
        <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-slate-900">
          Hubungi Kami & Layanan Pengaduan
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Kami siap melayani kebutuhan informasi seputar kurikulum, pendaftaran siswa baru, kemitraan, dan layanan akademik.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Direct Contacts & Interactive Map Mockup */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 text-base">
              Sekretariat & Hubungan Masyarakat
            </h3>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-100 text-blue-800 ring-1 ring-blue-200 shadow-sm shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 drop-shadow-sm" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Alamat Kampus:</span>
                  <span>{contactInfo.address}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-800 ring-1 ring-blue-200 shadow-sm shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 drop-shadow-sm" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Saluran Telepon & WhatsApp:</span>
                  <p className="font-mono text-slate-700 inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                    {contactInfo.phone} (Tata Usaha)
                  </p>
                  <p className="font-mono text-slate-700 inline-flex items-center gap-1">
                    <WhatsAppMark className="w-3.5 h-3.5 text-emerald-700" />
                    {contactInfo.whatsapp} (Layanan Informasi PPDB)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-800 ring-1 ring-emerald-200 shadow-sm shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 drop-shadow-sm" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Surat Elektronik (Email):</span>
                  <p className="font-mono text-slate-700">{contactInfo.publicEmail}</p>
                  <p className="font-mono text-slate-700">{contactInfo.ppdbEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-50 to-purple-100 text-violet-800 ring-1 ring-violet-200 shadow-sm shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 drop-shadow-sm" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Jam Operasional Pelayanan:</span>
                  <span>{contactInfo.weekdayHours}</span>
                  <br />
                  <span>{contactInfo.fridayHours}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-50 to-blue-100 text-blue-800 ring-1 ring-blue-200 shadow-sm shrink-0 mt-0.5">
                  <ExternalLink className="w-4 h-4 drop-shadow-sm" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-slate-800 block mb-2">Media Sosial Sekolah:</span>
                  <SchoolSocialLinks className="gap-x-4 gap-y-2" links={contactInfo} />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Campus Map Mockup */}
          <div className="bg-slate-900 text-white rounded-xl overflow-hidden border border-slate-800 shadow-sm space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Lokasi Sekolah
                </h4>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">Koordinat: 0.3291424519150115, 127.87374149476533</span>
            </div>

            {/* Peta Google Maps Asli */}
          <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
            <iframe
            title="Lokasi SMA Negeri 1 Halmahera Tengah"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.752558013867!2d127.87043701326934!3d0.32896542904286663!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x329d0f18edd6d49d%3A0x71a422d0cfb91e3a!2sSMA%20NEGERI%201%20HALTENG!5e0!3m2!1sid!2sid!4v1791034157196!5m2!1sid!2sid"
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            />
         </div>

            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-slate-400">Akses strategis jalan poros utama Weda</span>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
              >
                <span>Buka Petunjuk Arah</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Contact & Message Form */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="font-serif-title text-2xl font-bold text-slate-900">
                Kirim Pesan atau Pertanyaan
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pesan Anda akan langsung masuk ke sekretariat dan diteruskan ke bagian terkait (TU, BK, atau Panitia PPDB).
              </p>
            </div>

            {submitted ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">Pesan Berhasil Terkirim!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Terima kasih telah menghubungi kami. Petugas humas kami akan merespons pesan Anda melalui email atau WhatsApp dalam 1x24 jam kerja.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition-colors"
                >
                  Kirim Pesan Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSending}>
                {sendError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                  >
                    <p className="font-semibold">Pesan belum terkirim.</p>
                    <p className="mt-1">{sendError}</p>
                    <p className="mt-1 text-xs">Periksa koneksi internet dan server, lalu coba kirim kembali.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Nama Lengkap Anda <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Alamat Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="email@domain.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Nomor Telepon / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="0812xxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Kategori Pertanyaan
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none bg-white"
                    >
                      <option value={`Informasi PPDB ${academicYear.split('/')[0]}`}>Informasi PPDB {academicYear.split('/')[0]}</option>
                      <option value="Legalisir & Dokumen Alumni">Legalisir & Dokumen Alumni</option>
                      <option value="Mutasi / Pindah Masuk Siswa">Mutasi / Pindah Masuk Siswa</option>
                      <option value="Kemitraan & Sponsorship">Kemitraan & Sponsorship</option>
                      <option value="Saran & Pengaduan Layanan">Saran & Pengaduan Layanan</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Isi Pesan atau Pertanyaan <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Tuliskan pesan, pertanyaan, atau permohonan informasi Anda secara terperinci..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
                  >
                    {isSending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <Send className="w-4 h-4" />}
                    <span>{isSending ? 'Mengirim pesan...' : 'Kirim Pesan Sekarang'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* FAQ Accordion Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-900" />
              <h3 className="font-serif-title text-xl font-bold text-slate-900">
                Pertanyaan yang Sering Diajukan (FAQ)
              </h3>
            </div>

            <div className="space-y-3 pt-2">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 bg-white rounded-lg overflow-hidden">
                  <button
                    onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                    className="w-full px-4 py-3 text-left text-xs sm:text-sm font-semibold text-slate-900 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${faqOpen === idx ? 'rotate-180 text-blue-900' : ''}`} />
                  </button>
                  {faqOpen === idx && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 border-t border-slate-100 bg-slate-50/50 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
