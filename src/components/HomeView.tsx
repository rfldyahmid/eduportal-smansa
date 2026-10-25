import React, { useEffect, useRef, useState } from 'react';
import { formatNip } from '../utils/formatNip';
import { getCurrentAcademicYear } from '../utils/academicYear';
import { IMAGES } from '../assets/images';
import { LatestAnnouncements } from './LatestAnnouncements';
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { fetchHomeHeroSlides } from '../utils/api';

interface HomeViewProps {
  onNavigate: (tab: string) => void;
  onOpenPortal: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenPortal }) => {
  const academicYear = getCurrentAcademicYear();
  const [heroImages, setHeroImages] = useState<string[]>([IMAGES.heroSchool]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const loadSlides = () => {
      fetchHomeHeroSlides()
        .then(images => setHeroImages(images.length ? images : [IMAGES.heroSchool]))
        .catch(() => setHeroImages([IMAGES.heroSchool]));
    };
    loadSlides();
    window.addEventListener('home-hero-updated', loadSlides);
    return () => window.removeEventListener('home-hero-updated', loadSlides);
  }, []);

  useEffect(() => {
    setActiveHeroIndex(index => index % heroImages.length);
    if (heroImages.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveHeroIndex(index => (index + 1) % heroImages.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroImages]);

  const moveHero = (direction: -1 | 1) => {
    setActiveHeroIndex(index => (index + direction + heroImages.length) % heroImages.length);
  };

  return (
    <div className="space-y-16 lg:space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative flex min-h-[500px] items-center overflow-hidden bg-slate-900 text-white sm:min-h-[560px] lg:min-h-[640px]">
        {/* Background Image with Measured Contrast Scrim */}
        <div
          className="absolute inset-0 overflow-hidden"
          onTouchStart={event => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={event => {
            if (touchStartX.current === null || heroImages.length < 2) return;
            const distance = event.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(distance) > 45) moveHero(distance > 0 ? -1 : 1);
            touchStartX.current = null;
          }}
        >
          <div className="flex h-full w-full transition-transform duration-700 ease-in-out motion-reduce:transition-none" style={{ transform: `translateX(-${activeHeroIndex * 100}%)` }}>
            {heroImages.map((image, index) => (
              <div key={`${image}-${index}`} className="h-full w-full shrink-0">
                <img
                  src={image}
                  alt={`Foto beranda ${index + 1} SMA Negeri 1 Halmahera Tengah`}
                  className="h-full w-full object-cover object-center brightness-90"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-900/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
          {heroImages.length > 1 && (
            <>
              <button type="button" onClick={() => moveHero(-1)} aria-label="Foto beranda sebelumnya" className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-slate-950/35 p-2.5 text-white backdrop-blur-sm transition hover:bg-slate-950/65 sm:left-6">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => moveHero(1)} aria-label="Foto beranda berikutnya" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-slate-950/35 p-2.5 text-white backdrop-blur-sm transition hover:bg-slate-950/65 sm:right-6">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
                {heroImages.map((image, index) => (
                  <button key={`${image}-dot-${index}`} type="button" onClick={() => setActiveHeroIndex(index)} aria-label={`Tampilkan foto ${index + 1}`} aria-current={activeHeroIndex === index} className={`h-2 rounded-full transition-all ${activeHeroIndex === index ? 'w-7 bg-amber-300' : 'w-2 bg-white/60 hover:bg-white'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-8 sm:py-20 lg:py-28">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest">
              <span>SMA Negeri 1 Halmahera Tengah</span>
              <span aria-hidden="true">·</span>
              <span>Weda, Maluku Utara</span>
            </div>

            <h1 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]" style={{ textWrap: 'balance' }}>
              Membentuk Generasi Cerdas Berakhlak Mulia di Bumi Fagogoru
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Selamat datang di SMA Negeri 1 Halmahera Tengah. Kami mengintegrasikan Kurikulum Merdeka, sains analitis, budi pekerti Fagogoru, dan wawasan kemaritiman untuk mencetak insan unggul Maluku Utara.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate('ppdb')}
                className="px-6 py-3 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-all shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
              >
                <span>Pendaftaran PPDB {academicYear}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenPortal}
                className="px-6 py-3 text-sm font-semibold text-white bg-blue-900/80 hover:bg-blue-800 border border-blue-600/40 rounded-md transition-all backdrop-blur-sm flex items-center gap-2 whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Login Siswa & Guru</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUANTITATIVE PROOF STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 -mt-10 lg:-mt-16 relative z-10">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200/80 p-6 lg:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          <div className="border-l-2 border-blue-900 pl-4 space-y-1">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">1.280+</span>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Peserta Didik Aktif</p>
            <span className="text-[11px] text-slate-400 block">Tersebar di 36 Rombel</span>
          </div>

          <div className="border-l-2 border-amber-500 pl-4 space-y-1">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">78</span>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Pendidik Berdedikasi</p>
            <span className="text-[11px] text-slate-400 block">72% Berpendidikan S2 & S3</span>
          </div>

          <div className="border-l-2 border-emerald-600 pl-4 space-y-1">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">100%</span>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Kelulusan Siswa</p>
            <span className="text-[11px] text-slate-400 block">94% Lolos PTN Favorit & Kedinasan</span>
          </div>

          <div className="border-l-2 border-purple-600 pl-4 space-y-1">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">42</span>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Medali OSN & Riset</p>
            <span className="text-[11px] text-slate-400 block">Tingkat Provinsi & Nasional</span>
          </div>
        </div>
      </section>

      {/* 3. SAMBUTAN SINGKAT KEPALA SEKOLAH (TEASER) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Principal Photo */}
            <div className="lg:col-span-4 flex flex-col items-center sm:items-start">
              <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-xl overflow-hidden shadow-md border-2 border-white ring-1 ring-slate-200">
                <img
                  src={IMAGES.principalPortrait}
                  alt="Abdul Kadir Talib, S.Pd.I., M.Pd. - Kepala SMAN 1 Halmahera Tengah"
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="mt-4 text-center sm:text-left">
                <h3 className="font-semibold text-slate-900 text-base">
                  Abdul Kadir Talib, S.Pd.I., M.Pd.
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  NIP. {formatNip('197507062003121005')}
                </p>
                <span className="text-xs font-medium text-blue-900 block mt-0.5">
                  Kepala Sekolah SMA Negeri 1 Halmahera Tengah
                </span>
              </div>
            </div>

            {/* Speech Summary */}
            <div className="lg:col-span-8 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-900">
                Sambutan Kepala Sekolah
              </div>
              <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                "Menumbuhkan Karakter Mulia Fagogoru dan Keunggulan Sains Bahari"
              </h2>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Assalamu’alaikum Warahmatullahi Wabarakatuh, Salam Sejahtera bagi kita semua.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                Di era perkembangan industri dan teknologi modern di Kabupaten Halmahera Tengah, SMA Negeri 1 Halmahera Tengah berkomitmen mendidik tunas bangsa yang berilmu tinggi, berdaya saing global, namun tetap berakar kuat pada nilai-nilai luhur Fagogoru. Kami bertekad mewujudkan generasi yang berakhlak mulia, peduli lingkungan bahari, dan siap memajukan daerah serta bangsa.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('sambutan')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:text-blue-700 group transition-colors"
                >
                  <span>Baca Sambutan Lengkap Kepala Sekolah</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISI & MISI SEKOLAH */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white rounded-2xl p-8 sm:p-12 shadow-xl border border-blue-900/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-800/60 pb-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
                  Landasan Filosofis Pendidikan
                </span>
                <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-white">
                  Visi & Misi SMA Negeri 1 Halmahera Tengah
                </h2>
              </div>
              <button
                onClick={() => onNavigate('visimisi')}
                className="px-4 py-2 bg-blue-800/80 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg border border-blue-600/50 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>Lihat Visi Misi Selengkapnya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Visi Statement */}
            <div className="space-y-2 bg-white/5 p-6 rounded-xl border border-white/10 backdrop-blur-sm">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                Visi Sekolah:
              </span>
              <blockquote className="font-serif-title text-xl sm:text-2xl font-bold text-white leading-relaxed">
                “Terwujudnya peserta didik yang beriman, berakhlak mulia, berkarakter, unggul dalam prestasi, literat, kreatif, mandiri, peduli lingkungan, serta adaptif terhadap perkembangan teknologi untuk menghadapi tantangan masa depan.”
              </blockquote>
            </div>

            {/* Misi Highlights */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider block">
                Pilar Misi Penyelenggaraan Pendidikan:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-200">
                <div className="bg-slate-950/40 p-4 rounded-lg border border-white/5 space-y-1.5">
                  <span className="font-mono text-amber-400 font-bold block text-sm">01. Iman, Karakter & Budaya Lokal</span>
                  <p className="leading-relaxed text-slate-300">
                    Menanamkan keimanan, ketakwaan, akhlak mulia, integritas, kedisiplinan, tanggung jawab, gotong royong, serta penghargaan terhadap keberagaman dan kearifan lokal Halmahera Tengah.
                  </p>
                </div>
                <div className="bg-slate-950/40 p-4 rounded-lg border border-white/5 space-y-1.5">
                  <span className="font-mono text-amber-400 font-bold block text-sm">02. Pembelajaran Berkualitas & Prestasi</span>
                  <p className="leading-relaxed text-slate-300">
                    Mewujudkan pembelajaran yang aktif, inovatif, inklusif, dan berpusat pada peserta didik serta mengembangkan prestasi akademik, nonakademik, bakat, minat, kreativitas, dan kepemimpinan.
                  </p>
                </div>
                <div className="bg-slate-950/40 p-4 rounded-lg border border-white/5 space-y-1.5">
                  <span className="font-mono text-amber-400 font-bold block text-sm">03. Literasi, Numerasi & Teknologi Digital</span>
                  <p className="leading-relaxed text-slate-300">
                    Mengembangkan kemampuan literasi, numerasi, berpikir kritis, komunikasi, pemecahan masalah, serta kecakapan digital dan pemanfaatan kecerdasan artifisial (AI) secara bijak, etis, aman, dan bertanggung jawab.
                  </p>
                </div>
                <div className="bg-slate-950/40 p-4 rounded-lg border border-white/5 space-y-1.5">
                  <span className="font-mono text-amber-400 font-bold block text-sm">04. Lingkungan, Kemitraan & Tata Kelola Sekolah</span>
                  <p className="leading-relaxed text-slate-300">
                    Membangun budaya sekolah yang bersih, sehat, aman, dan peduli lingkungan, meningkatkan profesionalisme pendidik, memperkuat kemitraan dengan orang tua dan masyarakat, serta mewujudkan tata kelola sekolah yang transparan, akuntabel, dan berbasis data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PENGUMUMAN TERBARU & BERITA TERKINI */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <LatestAnnouncements onNavigate={onNavigate} />
      </section>

      {/* 5. SEKILAS KEHIDUPAN KAMPUS (PREVIEW IMAGES) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-10 lg:p-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
                Kehidupan Sekolah
              </span>
              <h2 className="font-serif-title text-2xl sm:text-3xl font-bold">
                Eksplorasi Kegiatan dan Kolaborasi Sekolah
              </h2>
            </div>
            <button
              onClick={() => onNavigate('galeri')}
              className="text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Buka Seluruh Galeri Foto</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group relative rounded-xl overflow-hidden aspect-[16/9] bg-slate-800">
              <img
                src={IMAGES.studentsActivity}
                alt="Praktikum Kolaborasi Riset Sains Siswa"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex items-end p-5">
                <div>
                  <h4 className="text-sm font-semibold text-white">Pembelajaran & Literasi Digital Terpadu</h4>
                  <p className="text-xs text-slate-300 mt-0.5">Penguatan literasi teknologi, informatika, dan kolaborasi aktif siswa di kelas.</p>
                </div>
              </div>
            </div>

            <div className="group relative rounded-xl overflow-hidden aspect-[16/9] bg-slate-800">
              <img
                src={IMAGES.extracurricular}
                alt="Prestasi Ekstrakurikuler dan Kepemimpinan"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex items-end p-5">
                <div>
                  <h4 className="text-sm font-semibold text-white">Pemberdayaan Bakat & Penyerahan Trofi Prestasi</h4>
                  <p className="text-xs text-slate-300 mt-0.5">Dukungan penuh untuk pengembangan minat olahraga, seni, dan kepemimpinan.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIAL ALUMNI (CLAIM-TO-PROOF ADJACENCY) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
            Jejak Alumni
          </span>
          <h2 className="font-serif-title text-2xl font-bold text-slate-900">
            Kisah Sukses Lulusan SMAN 1 Halmahera Tengah
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <p className="text-slate-600 text-xs sm:text-sm italic leading-relaxed">
              "Pondasi sains analitis dan motivasi para guru di Weda sangat berperan besar dalam memudahkan adaptasi perkuliahan kedokteran saya di Unhas. Nilai budi pekerti Fagogoru selalu saya jaga di perantauan."
            </p>
            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold text-slate-900">drg. Nurul Syahfitri</h4>
              <p className="text-[11px] text-slate-500">Alumni 2020 · Dokter Gigi Muda / Penerima Beasiswa Daerah Halteng</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <p className="text-slate-600 text-xs sm:text-sm italic leading-relaxed">
              "Lab komputer dan bimbingan guru fisika SMAN 1 Halteng membuka jalan karier saya di bidang keteknikan dan pengolahan industri strategis. Lulusan Halmahera Tengah mampu bersaing di tingkat nasional."
            </p>
            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold text-slate-900">Fikram Hi. Ahmad, S.T.</h4>
              <p className="text-[11px] text-slate-500">Alumni 2021 · Mining & Electrical Engineer di Kawasan Weda Bay</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <p className="text-slate-600 text-xs sm:text-sm italic leading-relaxed">
              "Pelatihan kepemimpinan di OSIS dan Paskibra SMAN 1 Halmahera Tengah membentuk mental disiplin tangguh yang mengantarkan saya lolos seleksi Akademi Angkatan Laut (AAL)."
            </p>
            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold text-slate-900">Letda Laut (P) Muhammad Rizky</h4>
              <p className="text-[11px] text-slate-500">Alumni 2019 · Perwira Pertama TNI AL / Lulusan Akademi Angkatan Laut</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
