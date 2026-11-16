import React from 'react';
import { MapPin, Phone, Mail, Clock, Award, Shield } from 'lucide-react';
import { IMAGES } from '../assets/images';
import { SchoolSocialLinks, WhatsAppMark } from './SchoolSocialLinks';
import { useContactInfo } from '../utils/contactInfo';
import { getCurrentAcademicYear } from '../utils/academicYear';

interface FooterProps {
  onNavigate: (tab: string) => void;
  onOpenPortal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenPortal }) => {
  const contactInfo = useContactInfo();
  const academicYear = getCurrentAcademicYear();

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 gap-x-6 gap-y-9 min-[360px]:grid-cols-2 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-12 lg:gap-y-10">
          {/* Column 1: School Identity */}
          <div className="space-y-4 min-[360px]:col-span-2 sm:col-span-2 lg:col-span-4">
            <div className="flex items-center gap-3">
              <img src={IMAGES.logoSekolah} alt="Logo SMA Negeri 1 Halmahera Tengah" className="school-logo-3d h-10 w-10 shrink-0 object-contain" />
              <div>
                <span className="font-serif-title text-base sm:text-lg font-bold tracking-tight text-white block">
                  SMA NEGERI 1 HALMAHERA TENGAH
                </span>
                <span className="text-xs text-amber-400/90 font-medium tracking-wider uppercase">
                  Budi Luhur Fagogoru
                </span>
              </div>
            </div>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
              Lembaga pendidikan menengah atas kebanggaan Halmahera Tengah berorientasi sains analitis, budi pekerti luhur Fagogoru, dan wawasan kemaritiman Maluku Utara.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Akreditasi B Kemendikbudristek</span>
              </div>
              <span className="text-slate-700">·</span>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>NPSN: 60201143</span>
              </div>
            </div>
          </div>

          {/* Column 2: Navigasi Cepat */}
          <div className="space-y-3 lg:col-span-2">
            <h4 className="border-b border-slate-800 pb-2 text-xs font-semibold uppercase tracking-wider text-white">
              Tautan Navigasi
            </h4>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs text-slate-400 min-[400px]:grid-cols-2 sm:grid-cols-1 lg:grid-cols-1">
              <li>
                <button onClick={() => onNavigate('beranda')} className="min-h-6 text-left hover:text-white transition-colors">
                  Beranda Utama
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('visimisi')} className="min-h-6 text-left hover:text-white transition-colors">
                  Visi & Misi Sekolah
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('sambutan')} className="min-h-6 text-left hover:text-white transition-colors">
                  Sambutan Kepala Sekolah
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('guru')} className="min-h-6 text-left hover:text-white transition-colors">
                  Direktori Guru & Staf
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('kombel')} className="min-h-6 text-left hover:text-white transition-colors">
                  KOMBEL Guru
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('galeri')} className="min-h-6 text-left hover:text-white transition-colors">
                  Galeri & Ekstrakurikuler
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('kontak')} className="min-h-6 text-left hover:text-white transition-colors">
                  Pusat Layanan & Aduan
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Layanan Akademik & PPDB */}
          <div className="space-y-3 lg:col-span-3">
            <h4 className="border-b border-slate-800 pb-2 text-xs font-semibold uppercase tracking-wider text-white">
              Layanan Digital
            </h4>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs text-slate-400 min-[400px]:grid-cols-2 sm:grid-cols-1 lg:grid-cols-1">
              <li>
                <button onClick={() => onNavigate('ppdb')} className="min-h-6 text-left hover:text-white transition-colors">
                  Informasi PPDB {academicYear}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('ppdb')} className="min-h-6 text-left hover:text-white transition-colors">
                  Formulir Pendaftaran Online
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('ppdb')} className="min-h-6 text-left hover:text-white transition-colors">
                  Cek Status Seleksi Berkas
                </button>
              </li>
              <li>
                <button onClick={onOpenPortal} className="min-h-6 text-left font-medium text-amber-400 hover:text-amber-300 transition-colors">
                  Portal Jadwal & Tugas Siswa
                </button>
              </li>
              <li>
                <button onClick={onOpenPortal} className="min-h-6 text-left hover:text-white transition-colors">
                  Portal Guru & Penugasan
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Kontak Resmi */}
          <div className="space-y-3 min-[360px]:col-span-2 sm:col-span-2 lg:col-span-3">
            <h4 className="border-b border-slate-800 pb-2 text-xs font-semibold uppercase tracking-wider text-white">
              Sekretariat & Lokasi
            </h4>
            <div className="grid grid-cols-1 gap-x-5 gap-y-3 text-xs text-slate-400 min-[400px]:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-start gap-2 min-[400px]:col-span-2 lg:col-span-1">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{contactInfo.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
                <span>{contactInfo.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <WhatsAppMark className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>WhatsApp: {contactInfo.whatsapp}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{contactInfo.publicEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400 shrink-0" />
                <span>{contactInfo.footerHours}</span>
              </div>
              <div className="pt-2">
                <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white">Media Sosial</h5>
                <SchoolSocialLinks variant="footer" className="gap-x-4 gap-y-2" links={contactInfo} />
              </div>
            </div>
          </div>
        </div>

        {/* Hairline Divider & Copyright */}
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-800 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p className="max-w-2xl">© {new Date().getFullYear()} SMA Negeri 1 Halmahera Tengah (Weda, Maluku Utara). Hak Cipta Dilindungi Undang-Undang.</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">
            <span>Sistem Informasi Akademik SMAN 1 Halteng</span>
            <span>·</span>
            <span>Standar Kurikulum Merdeka</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
