import React, { useEffect, useState } from 'react';
import { GalleryPhoto, YouTubeVideo, UserAccount } from '../types';
import { fetchGallery, fetchVideos } from '../utils/api';
import {
  Calendar,
  Eye,
  X,
  Archive,
  Video,
  Image as ImageIcon,
  Play,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Plus
} from 'lucide-react';

interface GalleryViewProps {
  onNavigate: (tab: string) => void;
  currentUser?: UserAccount | null;
}

const PHOTO_CATEGORIES = ['Semua', 'Akademik', 'Prestasi', 'Ekstrakurikuler', 'Olahraga', 'Sosialisasi', 'Upacara'];
const VIDEO_CATEGORIES = ['Semua', 'Profil', 'Prestasi', 'Kegiatan', 'Pembelajaran', 'Umum'];

export const GalleryView: React.FC<GalleryViewProps> = ({ onNavigate, currentUser }) => {
  const [viewMode, setViewMode] = useState<'foto' | 'video'>('foto');

  // Photo state
  const [photoItems, setPhotoItems] = useState<GalleryPhoto[]>([]);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState('Semua');
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Video state
  const [videoItems, setVideoItems] = useState<YouTubeVideo[]>([]);
  const [selectedVideoCategory, setSelectedVideoCategory] = useState('Semua');
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [photos, videos] = await Promise.all([
        fetchGallery().catch(() => []),
        fetchVideos().catch(() => [])
      ]);
      setPhotoItems(photos);
      setVideoItems(videos);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const handleUpdate = () => loadAll();
    window.addEventListener('gallery-updated', handleUpdate);
    window.addEventListener('videos-updated', handleUpdate);
    return () => {
      window.removeEventListener('gallery-updated', handleUpdate);
      window.removeEventListener('videos-updated', handleUpdate);
    };
  }, []);

  // Filtered photos
  const filteredPhotos = selectedPhotoCategory === 'Semua'
    ? photoItems
    : photoItems.filter(item => item.category === selectedPhotoCategory);

  // Filtered videos
  const filteredVideos = selectedVideoCategory === 'Semua'
    ? videoItems
    : videoItems.filter(item => item.category === selectedVideoCategory);

  // Multi-photo array for active item
  const allImagesForActive = activePhoto
    ? [activePhoto.image, ...(activePhoto.additionalImages || [])]
    : [];

  const handleNextPhoto = () => {
    if (!allImagesForActive.length) return;
    setActivePhotoIndex((prev) => (prev + 1) % allImagesForActive.length);
  };

  const handlePrevPhoto = () => {
    if (!allImagesForActive.length) return;
    setActivePhotoIndex((prev) => (prev - 1 + allImagesForActive.length) % allImagesForActive.length);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-16 space-y-10">
      {/* Header & Breadcrumb */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 uppercase tracking-widest">
          <button onClick={() => onNavigate('beranda')} className="hover:underline">Beranda</button>
          <span>/</span>
          <span className="text-slate-500">Galeri & Dokumentasi Sekolah</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-slate-900">
              Galeri Kegiatan & Video Sekolah
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1">
              Dokumentasi visual kiprah prestasi, kegiatan akademik, upacara, dan rekaman kegiatan resmi SMA Negeri 1 Halmahera Tengah.
            </p>
          </div>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => onNavigate('portal')}
              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Kelola Galeri di Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher: Galeri Foto vs Galeri Video YouTube */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-slate-200 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setViewMode('foto')}
            className={`px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'foto' ? 'bg-white text-blue-950 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-blue-900" />
            <span>Galeri Foto ({photoItems.length})</span>
          </button>
          <button
            onClick={() => setViewMode('video')}
            className={`px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'video' ? 'bg-white text-blue-950 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Video className="w-4 h-4 text-rose-600" />
            <span>Galeri Video ({videoItems.length})</span>
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {viewMode === 'foto' ? (
            PHOTO_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedPhotoCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedPhotoCategory === cat
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))
          ) : (
            VIDEO_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedVideoCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedVideoCategory === cat
                    ? 'bg-rose-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Memuat arsip media sekolah...</div>
      ) : viewMode === 'foto' ? (
        /* ================= PHOTO GALLERY ================= */
        filteredPhotos.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <Archive className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">Belum ada foto pada kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPhotos.map(item => {
              const count = 1 + (item.additionalImages?.length || 0);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setActivePhoto(item);
                    setActivePhotoIndex(0);
                  }}
                  className="group cursor-pointer bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-900/40 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {count > 1 && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/75 text-white text-[11px] font-mono backdrop-blur-sm">
                        +{count - 1} foto
                      </span>
                    )}
                    <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="px-3.5 py-1.5 rounded-lg bg-white/95 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-md">
                        <Eye className="w-3.5 h-3.5 text-blue-900" /> Lihat Detail Foto
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">{item.category}</span>
                      <div className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{item.date}</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-blue-900 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ================= YOUTUBE VIDEO GALLERY ================= */
        filteredVideos.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <Video className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">Belum ada video pada kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map(video => (
              <div
                key={video.id}
                onClick={() => setActiveVideo(video)}
                className="group cursor-pointer bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-rose-500/40 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 ml-1 fill-white" />
                    </div>
                  </div>
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/80 text-white text-[10px] font-mono rounded">
                    YouTube
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">{video.category}</span>
                    <span className="font-mono">{video.date}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-rose-700 transition-colors">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Photo Lightbox Modal */}
      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main Image with Prev/Next controls */}
            <div className="relative aspect-[16/9] bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={allImagesForActive[activePhotoIndex]}
                alt={activePhoto.title}
                className="w-full h-full object-contain"
              />

              {allImagesForActive.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 text-white text-xs font-mono rounded-full">
                    {activePhotoIndex + 1} / {allImagesForActive.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip if multi-photo */}
            {allImagesForActive.length > 1 && (
              <div className="p-3 bg-slate-100 flex items-center gap-2 overflow-x-auto border-b">
                {allImagesForActive.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      activePhotoIndex === idx ? 'border-blue-900 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Photo Details */}
            <div className="p-6 space-y-2 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded">{activePhoto.category}</span>
                <span>·</span>
                <span className="font-mono">{activePhoto.date}</span>
                <span>·</span>
                <span>Fotografer: {activePhoto.photographer}</span>
              </div>
              <h3 className="font-serif-title text-xl font-bold text-slate-900">{activePhoto.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">{activePhoto.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* YouTube Video Player Modal */}
      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Responsive 16:9 Iframe Player */}
            <div className="relative aspect-[16/9] bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            <div className="p-6 space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded">{activeVideo.category}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 font-mono">{activeVideo.date}</span>
                </div>
                <a
                  href={activeVideo.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  <span>Tonton di YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <h3 className="font-serif-title text-xl font-bold text-slate-900">{activeVideo.title}</h3>
              {activeVideo.description && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {activeVideo.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
