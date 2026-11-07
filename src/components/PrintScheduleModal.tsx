import React from 'react';
import { formatNip } from '../utils/formatNip';
import { Student, ScheduleItem } from '../types';
import { Printer, X, Download, Calendar, MapPin, Clock, CheckCircle } from 'lucide-react';

interface PrintScheduleModalProps {
  student: Student;
  schedules: ScheduleItem[];
  onClose: () => void;
}

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  student,
  schedules,
  onClose,
}) => {
  const days: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu')[] = [
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu',
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-2 backdrop-blur-sm animate-in fade-in sm:items-center sm:p-4"
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl overflow-hidden border border-slate-200">
        {/* Action Top Bar (Hidden when printing via CSS @media print) */}
        <div className="no-print flex flex-col gap-3 bg-slate-900 px-4 py-3.5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Dokumen Resmi Jadwal Pembelajaran Siswa (Format Cetak / PDF)</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="space-y-6 bg-white p-4 text-slate-900 sm:p-8 lg:p-12">
          {/* Institutional Kop Surat */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-slate-600">
              PEMERINTAH PROVINSI MALUKU UTARA
            </h3>
            <h4 className="text-xs uppercase tracking-widest font-semibold text-slate-600">
              DINAS PENDIDIKAN DAN KEBUDAYAAN
            </h4>
            <h1 className="font-serif-title text-xl sm:text-2xl font-bold tracking-tight text-blue-950">
              SMA NEGERI 1 HALMAHERA TENGAH
            </h1>
            <p className="text-[11px] text-slate-600">
              Jl. Skep, Desa Were, Kec. Weda, Kab. Halmahera Tengah, Maluku Utara 97853 · Telp: (0921) 312-0045 · Laman: www.sman1halteng.sch.id
            </p>
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-mono pt-0.5">
              <span>NPSN: 60201143</span>
              <span>·</span>
              <span>Akreditasi: B</span>
              <span>·</span>
              <span>Kabupaten Halmahera Tengah</span>
            </div>
            <div className="h-0.5 bg-slate-900 w-full mt-2" />
          </div>

          {/* Document Title */}
          <div className="text-center space-y-0.5">
            <h2 className="font-bold text-base uppercase tracking-wider text-slate-900">
              JADWAL MATA PELAJARAN PESERTA DIDIK
            </h2>
            <p className="text-xs text-slate-600 font-mono">
              Tahun Ajaran {student.academicYear} — Semester Genap
            </p>
          </div>

          {/* Student Biodata Summary */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono border border-slate-200 p-4 rounded-lg bg-slate-50/60">
            <div className="space-y-1.5">
              <div>
                <span className="text-slate-500 w-32 inline-block">Nama Lengkap:</span>
                <span className="font-bold text-slate-900 font-sans text-sm">{student.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 w-32 inline-block">NISN / NIS:</span>
                <span className="text-slate-800">{student.nisn} / {student.nis}</span>
              </div>
              <div>
                <span className="text-slate-500 w-32 inline-block">Kelas:</span>
                <span className="text-slate-800 font-sans font-semibold">{student.className}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div>
                <span className="text-slate-500 w-32 inline-block">Wali Kelas:</span>
                <span className="font-sans text-slate-900 font-semibold">{student.homeroomTeacher}</span>
              </div>
              <div>
                <span className="text-slate-500 w-32 inline-block">Tahun Ajaran:</span>
                <span className="text-slate-800">{student.academicYear}</span>
              </div>
              <div>
                <span className="text-slate-500 w-32 inline-block">Status Siswa:</span>
                <span className="text-emerald-700 font-bold font-sans">Aktif Terdaftar</span>
              </div>
            </div>
          </div>

          {/* Timetable Table */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center w-24">Hari</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center w-28">Jam Pelajaran</th>
                  <th className="py-2.5 px-4 border-r border-slate-300">Mata Pelajaran</th>
                  <th className="py-2.5 px-4 border-r border-slate-300">Guru Pengampu</th>
                  <th className="py-2.5 px-3 text-center w-36">Ruang / Lab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {days.map((day) => {
                  const daySchedules = schedules.filter((s) => s.day === day);
                  if (daySchedules.length === 0) return null;

                  return daySchedules.map((item, index) => (
                    <tr
                      key={item.id}
                      className={index === 0 ? 'border-t-2 border-slate-300' : ''}
                    >
                      {index === 0 && (
                        <td
                          rowSpan={daySchedules.length}
                          className="py-3 px-3 border-r border-slate-200 text-center font-bold text-blue-950 align-top bg-slate-50/50"
                        >
                          <div className="sticky top-0">
                            <span className="block text-xs uppercase tracking-wider">{day}</span>
                            <span className="text-[10px] text-slate-400 font-normal font-mono block mt-0.5">
                              {daySchedules.length} Sesi
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-mono text-slate-700 text-[11px] whitespace-nowrap">
                        {item.startTime} - {item.endTime}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-200 font-semibold text-slate-900">
                        {item.subject}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-200 text-slate-700 text-xs">
                        {item.teacherName}
                      </td>
                      <td className="py-2 px-3 text-center text-xs font-mono text-slate-600">
                        {item.room}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          {/* Student Rules & Operational Notes */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/40 text-[11px] space-y-1 text-slate-600">
            <span className="font-bold text-slate-800 block">Tata Tertib & Ketentuan Pembelajaran:</span>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Peserta didik wajib hadir di kelas selambat-lambatnya 15 menit sebelum jam pelajaran pertama dimulai (06.45 WIT).</li>
              <li>Kegiatan praktikum di laboratorium wajib mengenakan jas lab dan didampingi guru pembimbing.</li>
              <li>Izin ketidakhadiran harus dikonfirmasi melalui surat resmi orang tua/wali ke sekretariat atau wali kelas.</li>
            </ul>
          </div>

          {/* Formal Signatures Block */}
          <div className="pt-6 grid grid-cols-3 text-center text-xs text-slate-800">
            <div>
              <p className="text-slate-500">Mengetahui,</p>
              <p>Orang Tua / Wali Murid</p>
              <div className="h-16" />
              <p className="border-t border-slate-400 mx-6 pt-1 font-semibold">( ........................................ )</p>
            </div>

            <div>
              <p className="text-slate-500">Weda, 12 Januari 2026</p>
              <p>Wali Kelas {student.className}</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">{student.homeroomTeacher}</p>
              <p className="text-[10px] text-slate-500 font-mono">NIP. 198005122005011003</p>
            </div>

            <div>
              <p className="text-slate-500">Mengesahkan,</p>
              <p>Kepala SMA Negeri 1 Halmahera Tengah</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">Abdul Kadir Talib, S.Pd.I., M.Pd.</p>
              <p className="text-[10px] text-slate-500 font-mono">NIP. {formatNip('197507062003121005')}</p>
            </div>
          </div>

          {/* Verification stamp note */}
          <div className="text-center pt-2 text-[10px] text-slate-400 font-mono">
            Dokumen cetak jadwal resmi diterbitkan oleh Sistem Informasi Akademik SMAN 1 Halmahera Tengah pada {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </div>
        </div>
      </div>
    </div>
  );
};
