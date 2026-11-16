import React from 'react';
import { Compass, Award, Shield, Heart, Globe2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SCHOOL_MISSIONS } from '../utils/schoolMissions';

interface VisiMisiViewProps {
  onNavigate: (tab: string) => void;
}

export const VisiMisiView: React.FC<VisiMisiViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 lg:py-16 space-y-12">
      {/* Header Breadcrumb */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 uppercase tracking-widest">
          <button onClick={() => onNavigate('beranda')} className="hover:underline">Beranda</button>
          <span>/</span>
          <span>Profil Sekolah</span>
          <span>/</span>
          <span className="text-slate-500">Visi & Misi</span>
        </div>
        <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-slate-900">
          Visi, Misi, & Falsafah Luhur Sekolah
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Kompas filosofis dan pedoman strategis pendidikan SMA Negeri 1 Halmahera Tengah dalam mencetak generasi cerdas berakhlak mulia di Bumi Fagogoru.
        </p>
      </div>

      {/* 1. VISI UTAMA CARD */}
      <section className="bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white rounded-2xl p-8 sm:p-12 shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold uppercase tracking-wider border border-amber-400/30">
            <Compass className="w-3.5 h-3.5" />
            <span>Visi SMA Negeri 1 Halmahera Tengah</span>
          </div>

          <blockquote className="font-serif-title text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug">
            “Terwujudnya peserta didik yang beriman, berakhlak mulia, berkarakter, unggul dalam prestasi, literat, kreatif, mandiri, peduli lingkungan, serta adaptif terhadap perkembangan teknologi untuk menghadapi tantangan masa depan.”
          </blockquote>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl pt-2">
            Visi ini menjadi komitmen luhur warga sekolah di Weda dalam membimbing putra-putri Halmahera Tengah agar menguasai keunggulan akademik, sains terapan, serta menjunjung tinggi nilai budaya luhur daerah.
          </p>
        </div>
      </section>
      {/* 2. MISI SEKOLAH */}
      <section className="space-y-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
            Pilar Kerja
          </span>
          <h2 className="font-serif-title text-2xl font-bold text-slate-900">
            Misi SMA Negeri 1 Halmahera Tengah
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Langkah konkrit yang kami jalankan setiap hari di lingkungan akademik dan kemasyarakatan di Halmahera Tengah.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SCHOOL_MISSIONS.map((misi, index) => (
            <div key={misi} className="bg-slate-50/80 p-6 rounded-xl border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold font-mono">
                {String(index + 1).padStart(2, '0')}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{misi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. EMPAT PILAR NILAI LUHUR FAGOGORU */}
      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
            Kearifan Lokal
          </span>
          <h2 className="font-serif-title text-2xl font-bold text-slate-900">
            Empat Pilar Falsafah Luhur "Fagogoru"
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Pondasi moral budaya Halmahera Tengah yang menjiwai karakter dan keseharian warga SMAN 1 Halmahera Tengah.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <Heart className="w-5 h-5 text-rose-600" />
            <h4 className="font-bold text-slate-900 text-sm">Faisayang (Kasih Sayang)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Saling mengasihi, menyayangi, dan berempati antarwarga sekolah tanpa membeda-bedakan latar belakang sosial.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <Shield className="w-5 h-5 text-blue-900" />
            <h4 className="font-bold text-slate-900 text-sm">Fangare (Saling Menghormati)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Menjunjung tinggi kehormatan, tata krama kepada guru dan orang tua, serta menghargai perbedaan pandangan.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <Globe2 className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-slate-900 text-sm">Faimomamo (Gotong Royong)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Semangat bahu-membahu, saling menolong saat rekan mengalami kesulitan belajar, dan kerja sama demi kemajuan bersama.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <Award className="w-5 h-5 text-amber-600" />
            <h4 className="font-bold text-slate-900 text-sm">Faliyaro (Rasa Memiliki)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rasa tanggung jawab menjaga martabat sekolah dan berpartisipasi aktif memajukan bumi Fagogoru.
            </p>
          </div>
        </div>
      </section>

      {/* 4. LINK TO PRINCIPAL SPEECH & PPDB */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-blue-900 text-white rounded-xl">
        <div>
          <h3 className="font-semibold text-base">Ingin Mengenal Lebih Dalam Filosofi Sekolah Kami?</h3>
          <p className="text-xs text-blue-200 mt-0.5">
            Baca prakata langsung dari Kepala Sekolah atau jelajahi profil para pengajar.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('sambutan')}
            className="px-4 py-2 bg-white text-blue-950 font-semibold rounded-lg text-xs hover:bg-slate-100 transition-colors"
          >
            Sambutan Kepala Sekolah
          </button>
          <button
            onClick={() => onNavigate('guru')}
            className="px-4 py-2 bg-blue-800 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 transition-colors border border-blue-700"
          >
            Profil Guru & Staf
          </button>
        </div>
      </div>

      <nav aria-label="Navigasi halaman" className="flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => onNavigate('beranda')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Beranda
        </button>
        <button
          type="button"
          onClick={() => onNavigate('sambutan')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
        >
          Lanjut ke Sambutan
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
};
