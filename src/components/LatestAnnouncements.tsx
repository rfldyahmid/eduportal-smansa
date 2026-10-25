import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Announcement } from '../types';
import { fetchAnnouncements, markStudentNotificationsRead } from '../utils/api';
import { Calendar, Bell, ChevronLeft, ChevronRight, X, ArrowUpRight, Search, Archive, Image as ImageIcon } from 'lucide-react';

interface LatestAnnouncementsProps {
  onNavigate?: (tab: string) => void;
}

interface AnnouncementPhotoCarouselProps {
  images: string[];
  title: string;
  compact?: boolean;
}

const AnnouncementPhotoCarousel: React.FC<AnnouncementPhotoCarouselProps> = ({ images, title, compact = false }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToImage = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const nextIndex = (index + images.length) % images.length;
    track.scrollTo({ left: nextIndex * track.clientWidth, behavior: 'smooth' });
    setActiveIndex(nextIndex);
  };

  useEffect(() => {
    setActiveIndex(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [images.length]);

  if (!images.length) return null;

  return (
    <div className={`relative ${compact ? 'aspect-[16/8]' : ''} bg-slate-950`}>
      <div
        ref={trackRef}
        onScroll={event => {
          const track = event.currentTarget;
          if (track.clientWidth) setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
        }}
        className={`flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? '' : 'max-h-[32rem]'}`}
      >
        {images.map((image, index) => (
          <img
            key={`${image}-${index}`}
            src={image}
            alt={`${title} - foto ${index + 1}`}
            className={`w-full shrink-0 snap-center object-cover ${compact ? 'h-full' : 'h-64 sm:h-96'}`}
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <span
            aria-live="polite"
            className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-slate-900/75 px-2.5 py-1 text-[10px] font-semibold text-white"
          >
            Slide {activeIndex + 1} dari {images.length}
          </span>
          <button
            type="button"
            aria-label="Foto sebelumnya"
            onClick={event => {
              event.stopPropagation();
              scrollToImage(activeIndex - 1);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Foto berikutnya"
            onClick={event => {
              event.stopPropagation();
              scrollToImage(activeIndex + 1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((image, index) => (
              <button
                key={`${image}-dot-${index}`}
                type="button"
                aria-label={`Tampilkan foto ${index + 1}`}
                aria-current={index === activeIndex}
                onClick={event => {
                  event.stopPropagation();
                  scrollToImage(index);
                }}
                className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-5 bg-white' : 'w-2 bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
      {compact && images.length > 1 && (
        <span className="absolute right-3 top-3 rounded-md bg-slate-900/75 px-2 py-1 text-[10px] font-bold text-white">
          {images.length} Foto
        </span>
      )}
    </div>
  );
};

export const LatestAnnouncements: React.FC<LatestAnnouncementsProps> = ({ onNavigate }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');

  const load = async () => {
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Pengumuman gagal dimuat dari server.', error);
      setAnnouncements([]);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener('storage-announcements-updated', handleUpdate);
    return () => window.removeEventListener('storage-announcements-updated', handleUpdate);
  }, []);

  const sorted = useMemo(() => [...announcements].sort((a, b) =>
    new Date((b as any).createdAt || b.date).getTime() - new Date((a as any).createdAt || a.date).getTime()
  ), [announcements]);

  // Enam pengumuman terbaru tampil di papan utama; sisanya otomatis menjadi arsip.
  const latest = sorted.slice(0, 6);
  const archived = sorted.slice(6);

  const visible = showArchive ? archived : latest;
  const categories = ['Semua', 'Akademik', 'Prestasi', 'PPDB', 'Kegiatan', 'Umum'];
  const getAnnouncementImages = (item: Announcement) =>
    item.images?.length ? item.images : item.image ? [item.image] : [];

  const filtered = visible.filter(item => {
    const matchCat = showArchive || selectedCategory === 'Semua' || item.category === selectedCategory;
    const q = (showArchive ? archiveSearch : searchQuery).toLowerCase();
    const matchSearch = !q ||
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <section className="space-y-8" id="pengumuman-terbaru">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
            {showArchive ? <Archive className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            <span>{showArchive ? 'Arsip Warta Sekolah' : 'Papan Informasi Resmi'}</span>
          </div>
          <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            {showArchive ? 'Arsip Pengumuman & Berita' : 'Pengumuman Terbaru'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {showArchive
              ? 'Pengumuman lama tetap tersimpan dan dapat dibaca kembali kapan saja.'
              : 'Warta terkini, prestasi pelajar, jadwal agenda akademik, dan informasi terbaru SMAN 1 Halmahera Tengah.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={showArchive ? 'Cari arsip...' : 'Cari warta berita...'}
              value={showArchive ? archiveSearch : searchQuery}
              onChange={(e) => showArchive ? setArchiveSearch(e.target.value) : setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none bg-white"
            />
          </div>
          <button
            onClick={() => setShowArchive(v => !v)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 whitespace-nowrap ${
              showArchive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchive ? 'Warta Terbaru' : `Arsip (${archived.length})`}
          </button>
        </div>
      </div>

      {!showArchive && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === cat ? 'bg-blue-900 text-white font-semibold shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 space-y-2">
          <p className="text-sm font-medium text-slate-600">
            {showArchive ? 'Belum ada pengumuman yang masuk arsip.' : 'Tidak ada pengumuman yang sesuai dengan filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(item => {
            const images = getAnnouncementImages(item);
            return (
            <article
              key={item.id}
              onClick={() => {
                setActiveAnnouncement(item);
                markStudentNotificationsRead([`public-announcement:${item.id}`])
                  .then(() => window.dispatchEvent(new Event('server-announcements-read-updated')))
                  .catch(() => undefined);
              }}
              className="group cursor-pointer bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-blue-900/40 hover:shadow-md transition-all"
            >
              {images.length > 0 ? (
                <div className="relative" onClick={event => event.stopPropagation()}>
                  <AnnouncementPhotoCarousel images={images} title={item.title} compact />
                  {showArchive && <span className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] font-bold text-white"><Archive className="w-3 h-3" /> Arsip</span>}
                </div>
              ) : (
                <div className="h-14 bg-slate-50 border-b border-slate-100 flex items-center px-5 text-slate-300">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}

              <div className="p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.date}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-blue-950 font-sans">{item.category}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-blue-900 transition-colors line-clamp-2">{item.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{item.summary}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px] truncate max-w-[180px]">{item.author}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-900 group-hover:translate-x-0.5 transition-transform">
                    <span>Selengkapnya</span><ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}

      {activeAnnouncement && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveAnnouncement(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActiveAnnouncement(null)} className="absolute top-4 right-4 z-20 p-1.5 bg-black/60 text-white hover:bg-black/80 rounded-full" aria-label="Tutup"><X className="w-5 h-5" /></button>

            {getAnnouncementImages(activeAnnouncement).length > 0 && (
              <AnnouncementPhotoCarousel
                images={getAnnouncementImages(activeAnnouncement)}
                title={activeAnnouncement.title}
              />
            )}

            <div className="p-6 sm:p-8 space-y-5">
              <div className="space-y-2 border-b border-slate-200 pb-4 pr-6">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded">{activeAnnouncement.category}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono text-slate-500">{activeAnnouncement.date}</span>
                </div>
                <h2 className="font-serif-title text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{activeAnnouncement.title}</h2>
                <p className="text-xs text-slate-500">Diterbitkan oleh: <strong className="text-slate-700">{activeAnnouncement.author}</strong></p>
              </div>

              <p className="font-medium text-slate-900 bg-slate-50 p-4 rounded-xl border border-slate-100">{activeAnnouncement.summary}</p>
              <div className="whitespace-pre-line text-sm text-slate-700 leading-relaxed">{activeAnnouncement.content}</div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">SMA Negeri 1 Halmahera Tengah</span>
                <button onClick={() => setActiveAnnouncement(null)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold">Tutup Warta</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
