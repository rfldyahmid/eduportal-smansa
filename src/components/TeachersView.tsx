import React, { useState, useEffect } from 'react';
import { Teacher } from '../types';
import { formatNip } from '../utils/formatNip';
import { fetchTeachers } from '../utils/api';
import { Search, Mail, Phone, GraduationCap, Award, BookOpen } from 'lucide-react';

interface TeachersViewProps {
  onNavigate: (tab: string) => void;
}

export const TeachersView: React.FC<TeachersViewProps> = ({ onNavigate }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('Semua');

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

  const departments = ['Semua', 'MIPA', 'Bahasa', 'IPS', 'Informatika', 'Seni & Olahraga', 'BK'];

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesDept = selectedDept === 'Semua' || teacher.department === selectedDept;
    const matchesSearch =
      teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.education.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

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
        {/* Department interactive tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

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

      {/* Teacher Cards Grid */}
      {filteredTeachers.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl space-y-2">
          <p className="text-slate-600 font-medium text-sm">Tidak ada guru yang sesuai dengan pencarian.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDept('Semua');
            }}
            className="text-xs text-blue-900 hover:underline font-semibold"
          >
            Reset filter pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-900/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-4">
                {/* Photo & Identity */}
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
                    <span className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider block">
                      {teacher.department}
                    </span>
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

                {/* Bio & Education */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-start gap-1.5 text-slate-600">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{teacher.education}</span>
                  </div>

                  <p className="text-slate-600 italic text-[11px] leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                    "{teacher.bio}"
                  </p>
                </div>
              </div>

              {/* Contact Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                <a
                  href={`mailto:${teacher.email}`}
                  className="flex items-center gap-1.5 text-blue-900 hover:underline"
                  title="Kirim Email"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[170px]">{teacher.email.split('@')[0]}@...</span>
                </a>
                <span className="text-[11px] text-slate-400">Aktif Mengajar</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
