import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatNip } from '../utils/formatNip';
import { getCurrentAcademicYear } from '../utils/academicYear';
import { IMAGES } from '../assets/images';
import { LatestAnnouncements } from './LatestAnnouncements';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryPhoto, HomeStats, Teacher } from '../types';
import { fetchGallery, fetchHomeHeroSlides, fetchHomeStats, fetchTeachers } from '../utils/api';
import { SCHOOL_MISSIONS } from '../utils/schoolMissions';

const formatStatCount = (value: number | undefined) =>
  value === undefined ? '—' : new Intl.NumberFormat('id-ID').format(value);

interface HomeViewProps {
  onNavigate: (tab: string) => void;
  onOpenGalleryPhoto: (photoId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenGalleryPhoto }) => {
  const academicYear = getCurrentAcademicYear();
  const [heroImages, setHeroImages] = useState<string[]>([IMAGES.heroSchool]);
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);
  const [homeStatsError, setHomeStatsError] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryPhoto[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryError, setGalleryError] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const heroPointerStartX = useRef<number | null>(null);
  const teacherCarouselRef = useRef<HTMLDivElement>(null);

  const scrollTeachers = (direction: -1 | 1) => {
    const carousel = teacherCarouselRef.current;
    carousel?.scrollBy({ left: direction * carousel.clientWidth * 0.75, behavior: 'smooth' });
  };

  const loadTeachers = useCallback(() => {
    setTeachersLoading(true);
    setTeachersError(false);
    fetchTeachers()
      .then(data => setTeachers(data))
      .catch(error => {
        console.error('Gagal memuat daftar guru untuk beranda:', error);
        setTeachersError(true);
      })
      .finally(() => setTeachersLoading(false));
  }, []);

  useEffect(() => {
    let isLoading = false;
    const refreshStats = async () => {
      if (isLoading || document.visibilityState === 'hidden') return;
      isLoading = true;
      try {
        setHomeStats(await fetchHomeStats());
        setHomeStatsError(false);
      } catch (error) {
        console.error('Gagal memuat statistik sekolah untuk beranda:', error);
        setHomeStatsError(true);
      } finally {
        isLoading = false;
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshStats();
    };

    void refreshStats();
    const intervalId = window.setInterval(refreshStats, 30_000);
    window.addEventListener('focus', refreshStats);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshStats);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    const loadGallery = () => {
      setGalleryLoading(true);
      setGalleryError(false);
      fetchGallery()
        .then(items => setGalleryItems(items))
        .catch(error => {
          console.error('Gagal memuat galeri untuk beranda:', error);
          setGalleryError(true);
        })
        .finally(() => setGalleryLoading(false));
    };
    loadGallery();
    window.addEventListener('gallery-updated', loadGallery);
    return () => window.removeEventListener('gallery-updated', loadGallery);
  }, []);

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
    loadTeachers();
  }, [loadTeachers]);

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

  const galleryPreview = galleryItems.slice(0, 2);

  return (
    <div className="space-y-12 pb-16 sm:space-y-16 sm:pb-20 lg:space-y-24">
      {/* 1. HERO SECTION */}
      <section
        className="relative flex min-h-[430px] items-center overflow-hidden bg-slate-900 text-white min-[420px]:min-h-[460px] sm:min-h-[560px] lg:min-h-[640px] touch-pan-y"
        role="region"
        aria-label="Foto utama beranda"
        onPointerDown={event => {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          heroPointerStartX.current = event.clientX;
        }}
        onPointerUp={event => {
          if (heroPointerStartX.current === null || heroImages.length < 2) return;
          const distance = event.clientX - heroPointerStartX.current;
          if (Math.abs(distance) > 45) moveHero(distance > 0 ? -1 : 1);
          heroPointerStartX.current = null;
        }}
        onPointerCancel={() => { heroPointerStartX.current = null; }}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowLeft') moveHero(-1);
          if (event.key === 'ArrowRight') moveHero(1);
        }}
        tabIndex={0}
      >
        {/* Background Image with Measured Contrast Scrim */}
        <div
          className="absolute inset-0 overflow-hidden"
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
            <div className="absolute bottom-4 right-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/45 p-1.5 backdrop-blur-md sm:bottom-6 sm:right-6 sm:gap-2 sm:p-2">
              <button type="button" onClick={() => moveHero(-1)} aria-label="Foto beranda sebelumnya" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur-sm transition hover:bg-slate-950/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => moveHero(1)} aria-label="Foto beranda berikutnya" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur-sm transition hover:bg-slate-950/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="ml-1 flex items-center gap-2">
                {heroImages.map((image, index) => (
                  <button key={`${image}-dot-${index}`} type="button" onClick={() => setActiveHeroIndex(index)} aria-label={`Tampilkan foto ${index + 1}`} aria-current={activeHeroIndex === index} className={`h-2 rounded-full transition-all ${activeHeroIndex === index ? 'w-7 bg-amber-300' : 'w-2 bg-white/60 hover:bg-white'}`} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-8 sm:py-20 lg:py-28">
          <div className="max-w-3xl space-y-5 sm:space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-widest">
              <span>Weda, Maluku Utara</span>
            </div>

            <h1 className="font-serif-title font-bold leading-tight" style={{ textWrap: 'balance' }}>
              <span className="home-hero-title-line block font-sans text-2xl min-[420px]:text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-wide text-amber-400">
                Selamat Datang di
              </span>
              <span className="home-hero-title-line block font-sans text-2xl min-[420px]:text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-wide text-amber-400">
                Website SMA Negeri 1
              </span>
              <span className="home-hero-title-line block font-sans text-2xl min-[420px]:text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-wide text-amber-400">
                Halmahera Tengah
              </span>
            </h1>

            <p className="font-sans text-xs font-semibold uppercase tracking-widest text-white leading-snug" style={{ textWrap: 'balance' }}>
              Membentuk Generasi Cerdas Berakhlak Mulia di Bumi Fagogoru
            </p>

            {/* CTAs */}
            <div className="pt-3 flex flex-wrap items-center gap-3 sm:pt-4">
              <button
                onClick={() => onNavigate('ppdb')}
                className="px-6 py-3 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-all shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
              >
                <span>Pendaftaran PPDB {academicYear}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          </div>
        </div>
      </section>

      {/* 2. QUANTITATIVE PROOF STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 -mt-10 lg:-mt-16 relative z-10">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200/80 p-4 sm:p-6 lg:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          <div className="border-l-2 border-blue-900 pl-4 space-y-1">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{formatStatCount(homeStats?.students)}</span>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Peserta Didik Aktif</p>
            <span className="text-[11px] text-slate-400 block">Data siswa terdaftar</span>
          </div>

          <div className="border-l-2 border-amber-500 pl-4 space-y-1">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{formatStatCount(homeStats?.teachers)}</span>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Pendidik Berdedikasi</p>
            <span className="text-[11px] text-slate-400 block">Guru dan staf terdaftar</span>
          </div>

          <div className="border-l-2 border-emerald-600 pl-4 space-y-1">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{formatStatCount(homeStats?.announcements)}</span>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Pengumuman Sekolah</p>
            <span className="text-[11px] text-slate-400 block">Informasi yang dipublikasikan</span>
          </div>

          <div className="border-l-2 border-purple-600 pl-4 space-y-1">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{formatStatCount(homeStats?.gallery)}</span>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Album Galeri</p>
            <span className="text-[11px] text-slate-400 block">Dokumentasi kegiatan sekolah</span>
          </div>
        </div>
        {homeStatsError && (
          <p role="status" className="mt-2 text-center text-xs text-slate-500">
            Statistik belum dapat diperbarui. Akan dicoba kembali secara otomatis.
          </p>
        )}
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
                  <span>Baca selengkapnya</span>
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
                <span>Baca selengkapnya</span>
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

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="space-y-1">
                <span className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Arah Langkah Kami
                </span>
                <h3 className="font-serif-title text-xl font-bold text-slate-900">
                  Misi Sekolah
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {SCHOOL_MISSIONS.slice(0, 3).map((misi, index) => (
                  <div key={misi} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900">
                    <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-300">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{misi}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GURU & TENAGA PENDIDIK */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-widest">
              Para Pendidik
            </span>
            <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900">
              Guru & Tenaga Pendidik
            </h2>
          </div>
        </div>

        {teachersLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">Memuat daftar guru...</p>
        ) : teachersError ? (
          <div className="py-8 text-center text-sm text-slate-500">
            <p>Daftar guru belum dapat dimuat. Silakan coba lagi.</p>
            <button
              type="button"
              onClick={loadTeachers}
              className="mt-2 font-semibold text-blue-900 hover:underline"
            >
              Coba lagi
            </button>
          </div>
        ) : teachers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Belum ada profil guru yang tersedia.</p>
        ) : (
          <div className="relative">
            {teachers.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => scrollTeachers(-1)}
                  aria-label="Geser daftar guru ke kiri"
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-blue-950/85 p-2.5 text-white shadow-lg transition hover:bg-blue-800"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTeachers(1)}
                  aria-label="Geser daftar guru ke kanan"
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-blue-950/85 p-2.5 text-white shadow-lg transition hover:bg-blue-800"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <div
              ref={teacherCarouselRef}
              className="home-teacher-carousel flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 py-2"
            >
              {teachers.map(teacher => (
                <article
                  key={teacher.id}
                  className="group relative aspect-[3/4] w-48 shrink-0 snap-start overflow-hidden rounded-xl bg-slate-900 shadow-md transition-shadow hover:shadow-xl sm:w-56"
                >
                  <img
                    src={teacher.photoUrl || IMAGES.defaultAvatarNeutral}
                    alt={`Foto ${teacher.fullName}`}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 space-y-1 p-4">
                    <h3 className="line-clamp-2 text-base font-bold leading-snug text-amber-400">
                      {teacher.fullName}
                    </h3>
                    <p className="line-clamp-1 text-sm font-medium text-white">
                      {teacher.subject || 'Mata pelajaran belum dicantumkan'}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate('guru')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-900 transition-colors hover:text-amber-700"
          >
            Daftar Guru Selengkapnya
            <ArrowRight className="h-4 w-4" />
          </button>
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

          {galleryLoading ? (
            <p className="py-8 text-center text-sm text-slate-300">Memuat foto kehidupan sekolah...</p>
          ) : galleryError ? (
            <div className="py-8 text-center text-sm text-slate-300">
              <p>Galeri belum dapat dimuat. Silakan coba lagi.</p>
              <button type="button" onClick={() => window.dispatchEvent(new Event('gallery-updated'))} className="mt-2 font-semibold text-amber-400 hover:text-amber-300">
                Coba lagi
              </button>
            </div>
          ) : galleryPreview.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-300">Belum ada foto kehidupan sekolah di galeri.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {galleryPreview.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => onOpenGalleryPhoto(item.id)}
                  aria-label={`Buka foto ${item.title} di galeri`}
                  className="group w-full text-left relative rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-800 p-[3px] shadow-[0_16px_40px_-18px_rgba(251,191,36,0.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_-16px_rgba(251,191,36,0.65)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-t-[13px] bg-slate-800 ring-1 ring-white/15 sm:aspect-[16/9] md:rounded-[13px]">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent transition-colors duration-300 group-hover:from-slate-950/90 md:from-slate-950/95 md:via-slate-950/20" />
                    <span className="absolute left-4 top-4 rounded-full border border-white/25 bg-slate-950/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 backdrop-blur-md">
                      {item.category || `Cerita Sekolah 0${index + 1}`}
                    </span>
                    <div className="rounded-b-[13px] bg-slate-800 p-4 sm:p-5 md:absolute md:inset-x-0 md:bottom-0 md:rounded-none md:bg-transparent md:p-6">
                      <div className="mb-2 h-px w-10 bg-amber-400 transition-all duration-300 group-hover:w-16" />
                      <h4 className="text-base font-bold leading-snug text-white sm:text-lg">{item.title}</h4>
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-200 sm:text-sm md:line-clamp-2">{item.description || 'Momen kebersamaan dan semangat belajar di lingkungan sekolah.'}</p>
                    </div>
                    <div className="pointer-events-none absolute inset-3 rounded-lg border border-white/20" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};
