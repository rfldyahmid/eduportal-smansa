import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Megaphone,
  LogOut,
  User,
  Clock3,
  MapPin,
  ChevronRight,
  Printer,
  Send,
  CheckCircle2,
  FileCheck,
  FileUp,
  Bell,
  Award,
  MessageSquare
} from 'lucide-react';
import { Student, UserAccount, ScheduleItem, Assignment, PortalAnnouncement, AssignmentSubmission } from '../../types';
import { fetchMyStudentProfile, fetchStudentNotificationReads, markStudentNotificationsRead, fetchAssignments, fetchPortalAnnouncements, fetchSubmissions, submitAssignment, fetchSchedules } from '../../utils/api';
import { PrintScheduleModal } from '../PrintScheduleModal';

interface StudentPortalProps {
  currentUser: UserAccount;
  onLogout: () => void;
}

const DAYS: ScheduleItem['day'][] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
type NotificationCategory = 'jadwal' | 'tugas' | 'pengumuman';

function notificationKey(category: NotificationCategory, id: string, details: unknown) {
  return `${category}:${id}:${JSON.stringify(details)}`;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
  } catch { return value; }
}

function formatDeadline(value: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch { return value; }
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser, onLogout }) => {
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  // Empty values keep derived views safe while the authenticated profile is loading.
  const student: Student = studentProfile || {
    id: '', nisn: '', nis: '', fullName: '', email: '', gender: 'Laki-laki',
    classId: '', className: '', major: 'Fase E (Umum)', academicYear: '', homeroomTeacher: ''
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'jadwal' | 'tugas' | 'pengumuman'>('dashboard');
  const [selectedDay, setSelectedDay] = useState<ScheduleItem['day']>('Senin');
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [announcements, setAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [seenNotificationKeys, setSeenNotificationKeys] = useState<string[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Submission Form State
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [isSendingSubmission, setIsSendingSubmission] = useState(false);
  const [submissionFeedbackMsg, setSubmissionFeedbackMsg] = useState<{ id: string; text: string } | null>(null);
  // State for file upload
  const [fileInfo, setFileInfo] = useState<{ file: File; name: string; size: string } | null>(null);
  const submissionFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileInfo({
      file,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    });
  };

  const loadData = async () => {
    try {
      const profile = await fetchMyStudentProfile();
      setStudentProfile(profile);
      setProfileLoadError(null);
    } catch (error) {
      setProfileLoadError(error instanceof Error ? error.message : 'Profil siswa gagal dimuat dari server.');
      return;
    }

    let locallySeen: string[] = [];
    try {
      locallySeen = await fetchStudentNotificationReads();
    } catch (error) {
      console.error('Status baca notifikasi gagal dimuat dari server.', error);
    }
    setSeenNotificationKeys(locallySeen);

    try {
      const [backendScheds, backendAsgs, backendSubs, backendAnnouncements] = await Promise.all([
        fetchSchedules(),
        fetchAssignments(),
        fetchSubmissions(),
        fetchPortalAnnouncements()
      ]);
      setSchedules(backendScheds);
      setAssignments(backendAsgs);
      setSubmissions(backendSubs);
      setAnnouncements(backendAnnouncements);
      setDataLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Data portal gagal dimuat dari server.';
      setDataLoadError(message);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage-schedules-updated', loadData);
    window.addEventListener('storage-assignments-updated', loadData);
    window.addEventListener('storage-portal-announcements-updated', loadData);
    window.addEventListener('storage', loadData);
    const refreshTimer = window.setInterval(loadData, 30000);
    return () => {
      window.removeEventListener('storage-schedules-updated', loadData);
      window.removeEventListener('storage-assignments-updated', loadData);
      window.removeEventListener('storage-portal-announcements-updated', loadData);
      window.removeEventListener('storage', loadData);
      window.clearInterval(refreshTimer);
    };
  }, [currentUser.id]);

  const mySchedules = useMemo(
    () => schedules.filter(s => s.classId === student.classId),
    [schedules, student.classId]
  );
  const daySchedules = mySchedules
    .filter(s => s.day === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const myAssignments = assignments
    .filter(a => a.classId === student.classId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const myAnnouncements = announcements
    .filter(a => {
      if (a.category === 'Umum') return true;
      if (a.category === 'Kelas X') return student.classId.startsWith('X-');
      if (a.category === 'Kelas XI') return student.classId.startsWith('XI-');
      if (a.category === 'Kelas XII') return student.classId.startsWith('XII-');
      return a.targetClass === student.classId;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const currentNotificationKeys: Record<NotificationCategory, string[]> = {
    jadwal: mySchedules.map(item => notificationKey('jadwal', item.id, {
      day: item.day,
      startTime: item.startTime,
      endTime: item.endTime,
      subject: item.subject,
      teacherName: item.teacherName,
      room: item.room
    })),
    tugas: myAssignments.map(item => notificationKey('tugas', item.id, {
      title: item.title,
      description: item.description,
      deadline: item.deadline,
      createdAt: item.createdAt
    })),
    pengumuman: myAnnouncements.map(item => notificationKey('pengumuman', item.id, {
      title: item.title,
      category: item.category,
      content: item.content,
      createdAt: item.createdAt
    }))
  };
  const seenKeys = new Set(seenNotificationKeys);
  const unreadNotifications = {
    jadwal: currentNotificationKeys.jadwal.filter(key => !seenKeys.has(key)).length,
    tugas: currentNotificationKeys.tugas.filter(key => !seenKeys.has(key)).length,
    pengumuman: currentNotificationKeys.pengumuman.filter(key => !seenKeys.has(key)).length
  };
  const totalUnreadNotifications = Object.values(unreadNotifications).reduce((total, count) => total + count, 0);

  const markNotificationsRead = async (category: NotificationCategory, keys = currentNotificationKeys[category]) => {
    const updated = Array.from(new Set([...seenNotificationKeys, ...keys]));
    setSeenNotificationKeys(updated);
    try {
      await markStudentNotificationsRead(keys);
    } catch (error) {
      console.error('Status baca notifikasi gagal disimpan ke server.', error);
    }
  };

  if (profileLoadError || !studentProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h1 className="font-bold">Profil siswa tidak dapat dimuat</h1>
          <p className="mt-2 text-sm">{profileLoadError || 'Menghubungkan ke server…'}</p>
          {profileLoadError && <button onClick={loadData} className="mt-4 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white">Coba lagi</button>}
        </div>
        <button onClick={onLogout} className="mt-4 text-sm font-semibold text-slate-600">Keluar</button>
      </div>
    );
  }

  const openStudentTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'jadwal') {
      const visibleKeys = currentNotificationKeys.jadwal.filter((_, index) => mySchedules[index].day === selectedDay);
      markNotificationsRead(tab, visibleKeys);
    } else if (tab !== 'dashboard') {
      markNotificationsRead(tab);
    }
  };

  const handleOpenSubmitForm = (assignmentId: string) => {
    const existing = submissions.find(s => s.assignmentId === assignmentId);
    setSubmissionText(existing?.linkOrContent || '');
    setSubmittingAssignmentId(assignmentId);
    setSubmissionFeedbackMsg(null);
    // reset previous file selection when opening a form
    setFileInfo(null);
  };

  const handleSubmitTask = async (e: React.FormEvent, assignmentId: string) => {
    e.preventDefault();
    // If a file is selected, we will upload it; otherwise require at least some text/link
    if (!fileInfo && !submissionText.trim()) {
      alert('Harap pilih file atau masukkan teks/tautan.');
      return;
    }
    setIsSendingSubmission(true);
    setSubmissionFeedbackMsg(null);

    try {
      const created = await submitAssignment({
        assignmentId,
        submissionType: fileInfo ? 'file' : (submissionText.startsWith('http') ? 'link' : 'text'),
        linkOrContent: submissionText.trim(),
        file: fileInfo?.file
      });
      setSubmissions(prev => [created, ...prev.filter(s => s.assignmentId !== assignmentId)]);
      setSubmissionFeedbackMsg({ id: assignmentId, text: 'Tugas berhasil dikirim ke guru pengampu!' });
      setSubmittingAssignmentId(null);
      setFileInfo(null);
    } catch (err: any) {
      alert(err?.message || 'Gagal mengirim tugas.');
    } finally {
      setIsSendingSubmission(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: CalendarDays },
    { id: 'jadwal', label: 'Jadwal Belajar', icon: CalendarDays },
    { id: 'tugas', label: `Tugas (${myAssignments.length})`, icon: ClipboardList },
    { id: 'pengumuman', label: 'Pengumuman Portal', icon: Megaphone }
  ] as const;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-3 py-6 sm:px-8 sm:py-8">
      {dataLoadError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Sebagian data portal gagal dimuat dari server: {dataLoadError}. Data lokal tidak digunakan sebagai pengganti.</div>}
      {/* Student Profile Ribbon */}
      <div className="min-w-0 rounded-2xl bg-slate-900 p-4 text-white shadow-xl sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-900 border-2 border-blue-700 overflow-hidden flex items-center justify-center font-bold text-amber-300 text-xl">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                student.fullName.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-blue-200">Portal Siswa Terpadu</p>
              <h1 className="mt-0.5 break-words text-xl font-bold sm:text-3xl">{student.fullName}</h1>
              <p className="mt-1 break-words text-xs text-slate-300 sm:text-sm">
                {student.className} · NISN: <span className="font-mono text-amber-300">{student.nisn}</span> · Wali Kelas: {student.homeroomTeacher}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto"
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-1 flex touch-pan-x gap-2 overflow-x-auto px-1 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => openStudentTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${activeTab === tab.id ? 'bg-blue-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Icon size={16} /> {tab.label}
              {tab.id !== 'dashboard' && unreadNotifications[tab.id] > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Bell size={11} /> {unreadNotifications[tab.id]} Baru
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {totalUnreadNotifications > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <p className="text-xs font-semibold">
                Ada {totalUnreadNotifications} pembaruan baru yang belum Anda lihat.
              </p>
              <div className="flex flex-wrap gap-2">
                {(['jadwal', 'tugas', 'pengumuman'] as const).filter(category => unreadNotifications[category] > 0).map(category => (
                  <button
                    key={category}
                    onClick={() => openStudentTab(category)}
                    className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-blue-900 border border-amber-200 hover:bg-amber-100"
                  >
                    Lihat {category === 'jadwal' ? 'Jadwal' : category === 'tugas' ? 'Tugas' : 'Pengumuman'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid lg:grid-cols-3 gap-5">
            <button
              onClick={() => openStudentTab('jadwal')}
              className="text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-900/40 transition-all cursor-pointer"
            >
              <CalendarDays className="text-blue-900 w-8 h-8" />
              <h2 className="font-bold text-lg mt-3 text-slate-900">Jadwal Belajar</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {mySchedules.length} mata pelajaran aktif untuk {student.className}.
              </p>
            </button>
            <button
              onClick={() => openStudentTab('tugas')}
              className="text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all cursor-pointer"
            >
              <ClipboardList className="text-amber-600 w-8 h-8" />
              <h2 className="font-bold text-lg mt-3 text-slate-900">Tugas & Pengumpulan</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {myAssignments.length} tugas diberikan ({submissions.length} sudah Anda kumpulkan).
              </p>
            </button>
            <button
              onClick={() => openStudentTab('pengumuman')}
              className="text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-emerald-600/40 transition-all cursor-pointer"
            >
              <Megaphone className="text-emerald-600 w-8 h-8" />
              <h2 className="font-bold text-lg mt-3 text-slate-900">Pengumuman Kelas</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {myAnnouncements.length} informasi terbaru dari guru Anda.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* 2. JADWAL PELAJARAN */}
      {activeTab === 'jadwal' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-xl text-slate-900">Jadwal Mata Pelajaran</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Jadwal resmi untuk {student.className} (Wali Kelas: {student.homeroomTeacher}).
              </p>
            </div>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Printer size={15} /> Cetak Jadwal Resmi (PDF)
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto p-4 border-b border-slate-100">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => {
                  setSelectedDay(day);
                  const visibleKeys = currentNotificationKeys.jadwal.filter((_, index) => mySchedules[index].day === day);
                  markNotificationsRead('jadwal', visibleKeys);
                }}
                className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${selectedDay === day ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="p-5 space-y-3">
            {daySchedules.length ? (
              daySchedules.map(item => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-blue-900/40 transition-colors">
                  <div className="w-28 shrink-0 font-mono text-xs sm:text-sm font-bold text-blue-900">{item.startTime}–{item.endTime}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm sm:text-base text-slate-900">{item.subject}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.teacherName}</div>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={14} /> {item.room || 'Ruang Kelas'}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">Belum ada jadwal untuk hari {selectedDay}.</div>
            )}
          </div>
        </section>
      )}

      {/* 3. TUGAS & PENGUMPULAN JAWABAN */}
      {activeTab === 'tugas' && (
        <section className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-xl text-slate-900">Tugas & Pengumpulan Jawaban</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kirimkan lembar jawaban, ringkasan, atau tautan dokumen tugas Anda langsung ke guru pengampu.
            </p>
          </div>

          {myAssignments.length ? (
            myAssignments.map(item => {
              const mySub = submissions.find(s => s.assignmentId === item.id);
              const isFormOpen = submittingAssignmentId === item.id;
              const hasFeedback = submissionFeedbackMsg?.id === item.id;

              return (
                <article key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b pb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded">
                        {item.subject}
                      </span>
                      <h3 className="font-bold text-lg text-slate-900 mt-2">{item.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Guru Pengampu: {item.teacherName}</p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5">
                      <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                        <Clock3 size={14} /> Deadline: {formatDeadline(item.deadline)}
                      </div>
                      {mySub ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${mySub.status === 'Dinilai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : mySub.status === 'Terlambat'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                            }`}>
                            Status: {mySub.status}
                          </span>
                          {mySub.score !== undefined && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 font-mono">
                              Nilai: {mySub.score} / {item.maxScore}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                          Belum Dikumpulkan
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {item.description}
                  </p>

                  {/* Previous submission view */}
                  {mySub && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          Jawaban yang Anda kirimkan ({mySub.submittedAt}):
                        </span>
                        {!isFormOpen && (
                          <button
                            onClick={() => handleOpenSubmitForm(item.id)}
                            className="text-blue-900 hover:underline font-semibold cursor-pointer"
                          >
                            Perbarui Jawaban
                          </button>
                        )}
                      </div>
                      <p className="text-slate-800 bg-white p-3 rounded border font-mono text-[11px] whitespace-pre-line">
                        {mySub.linkOrContent}
                      </p>
                      {mySub.feedback && (
                        <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded text-blue-950">
                          <span className="font-bold flex items-center gap-1 mb-0.5">
                            <MessageSquare className="w-3.5 h-3.5" /> Catatan & Umpan Balik Guru ({mySub.gradedBy}):
                          </span>
                          <p>{mySub.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {hasFeedback && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-1.5 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{submissionFeedbackMsg.text}</span>
                    </div>
                  )}

                  {/* Submission Form Toggle */}
                  {!mySub && !isFormOpen && (
                    <button
                      onClick={() => handleOpenSubmitForm(item.id)}
                      className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kumpulkan Jawaban Tugas Ini</span>
                    </button>
                  )}

                  {isFormOpen && (
                    <form onSubmit={(e) => handleSubmitTask(e, item.id)} className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3">
                      <h4 className="font-bold text-xs text-blue-950">
                        {mySub ? 'Perbarui Lembar Jawaban Tugas' : 'Formulir Pengumpulan Tugas Siswa'}
                      </h4>
                      <div className="space-y-1">
                        <input
                          ref={submissionFileInputRef}
                          type="file"
                          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                        <button
                          type="button"
                          onClick={() => submissionFileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-white text-blue-900 hover:bg-blue-50 text-xs font-semibold rounded-lg border border-blue-300 cursor-pointer"
                        >
                          <FileUp className="w-4 h-4" />
                          Pilih File PDF atau Word
                        </button>
                        {fileInfo && (
                          <div className="mt-1 text-xs text-slate-600">
                            File: {fileInfo.name} ({fileInfo.size})
                          </div>
                        )}
                        <textarea
                          rows={4}
                          placeholder="Opsional: Tambahkan catatan atau deskripsi tugas..."
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={isSendingSubmission}
                          className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSendingSubmission ? 'Mengirimkan...' : 'Kirim ke Guru'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmittingAssignmentId(null)}
                          className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg border border-slate-300 cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border p-12 text-center text-slate-500 text-xs">
              Belum ada tugas untuk kelas {student.className}.
            </div>
          )}
        </section>
      )}

      {/* 4. PENGUMUMAN PORTAL */}
      {activeTab === 'pengumuman' && (
        <section className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-xl text-slate-900">Pengumuman Internal Siswa</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Khusus komunikasi internal kelas dan instruksi guru.
            </p>
          </div>
          {myAnnouncements.length ? (
            myAnnouncements.map(item => (
              <article key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 font-semibold">{item.category}</span>
                      <span className="text-slate-500 py-0.5">{formatDate(item.createdAt)}</span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 mt-1.5">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-700 mt-1.5 whitespace-pre-line leading-relaxed">{item.content}</p>
                    <p className="text-[11px] text-slate-500 mt-3 font-semibold">Pengirim: {item.teacherName}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="bg-white rounded-2xl border p-12 text-center text-slate-500 text-xs">
              Belum ada pengumuman untuk Anda.
            </div>
          )}
        </section>
      )}

      {/* Print Schedule Modal */}
      {isPrintModalOpen && (
        <PrintScheduleModal
          student={student}
          schedules={mySchedules}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
