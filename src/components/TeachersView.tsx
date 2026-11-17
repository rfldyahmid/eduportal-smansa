import React, { useState, useEffect } from 'react';
import { Teacher } from '../types';
import { formatNip } from '../utils/formatNip';
import { fetchTeachers } from '../utils/api';
import { Search, Mail, Eye, X } from 'lucide-react';

interface TeachersViewProps {
  onNavigate: (tab: string) => void;
}

const matchesTeacherSearch = (teacher: Teacher, query: string) => {
  const normalizedQuery = query.toLowerCase();
  return teacher.fullName.toLowerCase().includes(normalizedQuery) ||
    teacher.subject.toLowerCase().includes(normalizedQuery);
};

const TeacherCard: React.FC<{
  teacher: Teacher;
  featured?: boolean;
  onPreview: (teacher: Teacher) => void;
}> = ({ teacher, featured = false, onPreview }) => (
  <div
    className={featured
      ? 'w-full md:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)] bg-white border border-amber-300 rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4'
      : 'bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-900/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4'}
  >
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-20 h-24 rounded-lg overflow-hidden shrink-0 bg-slate-100 ring-1 ring-slate-200">
          <img
            src={teacher.photoUrl}
            alt={teacher.fullName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate" title={teacher.fullName}>
            {teacher.fullName}
          </h3>
          <p className="text-xs text-slate-500 font-mono">
            NIP. {formatNip(teacher.nip)}
          </p>
          <p className="text-xs font-medium text-amber-700">
            {teacher.subject}
          </p>
        </div>
      </div>
    </div>

    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500 font-mono">
      <a
        href={`mailto:${teacher.email}`}
        className="flex items-center gap-1.5 text-blue-900 hover:underline"
        title="Kirim Email"
      >
        <Mail className="w-3.5 h-3.5" />
        <span className="truncate max-w-[170px]">{teacher.email.split('@')[0]}@...</span>
      </a>
      <button
        type="button"
        onClick={() => onPreview(teacher)}
        disabled={!teacher.photoUrl}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-blue-900 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Pratinjau foto ${teacher.fullName}`}
      >
        <Eye className="h-3.5 w-3.5" />
        Lihat Foto
      </button>
    </div>
  </div>
);

export const TeachersView: React.FC<TeachersViewProps> = ({ onNavigate }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTeacher, setPreviewTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    fetchTeachers()
      .then(data => {
        setTeachers(data);
      })
      .catch(error => {
        console.error('Data guru gagal dimuat dari server.', error);
        setTeachers([]);
      });
  }, []);

  useEffect(() => {
    if (!previewTeacher) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewTeacher(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewTeacher]);

  const principal = teachers.find(teacher => teacher.subject.trim().toLowerCase() === 'kepala sekolah');
  const filteredPrincipal = principal && matchesTeacherSearch(principal, searchQuery) ? principal : null;
  const filteredTeachers = teachers.filter(teacher =>
    teacher.id !== principal?.id && matchesTeacherSearch(teacher, searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-16 space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 uppercase tracking-widest">
          <button onClick={() => onNavigate('beranda')} className="hover:underline">Beranda</button>
          <span>/</span>
          <span className="text-slate-500">Direktori Guru</span>


        </div>
        <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-slate-900">
          Profil Guru & Tenaga Pendidik
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Kenali jajaran pendidik profesional, bersertifikasi nasional, dan berdedikasi tinggi membimbing putra-putri SMA Negeri 1 Halmahera Tengah.
        </p>
      </div>

      {/* Filter and Search Controls (Functional Buttons - zero slop) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru atau mata pelajaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Principal and teacher profiles */}
      {!filteredPrincipal && filteredTeachers.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl space-y-2">
          <p className="text-slate-600 font-medium text-sm">Tidak ada guru yang sesuai dengan pencarian.</p>
          <button
            onClick={() => {
              setSearchQuery('');
            }}
            className="text-xs text-blue-900 hover:underline font-semibold"
          >
            Reset filter pencarian
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredPrincipal && (
            <section className="space-y-4">
              <h2 className="font-serif-title text-xl font-bold text-slate-900 text-center">Kepala Sekolah</h2>
              <div className="flex justify-center">
                <TeacherCard teacher={filteredPrincipal} featured onPreview={setPreviewTeacher} />
              </div>
            </section>
          )}
          {filteredTeachers.length > 0 && (
            <section className="space-y-4">
              {filteredPrincipal && (
                <h2 className="font-serif-title text-xl font-bold text-slate-900">Guru & Tenaga Pendidik</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeachers.map(teacher => (
                  <TeacherCard key={teacher.id} teacher={teacher} onPreview={setPreviewTeacher} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {previewTeacher && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto profil"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 p-4"
          onClick={() => setPreviewTeacher(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewTeacher(null)}
            aria-label="Tutup pratinjau foto"
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={previewTeacher.photoUrl}
            alt="Foto profil"
            className="aspect-[5/6] w-[360px] max-h-[80vh] max-w-[90vw] object-cover"
            referrerPolicy="no-referrer"
            onClick={event => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
