import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Megaphone,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Users,
  CheckCircle2,
  FileCheck,
  Award,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Download
} from 'lucide-react';
import { Teacher, UserAccount, ScheduleItem, Assignment, PortalAnnouncement, AssignmentSubmission } from '../../types';
import {
  fetchTeachers,
  fetchSchedules,
  createSchedule,
  updateSchedule,
  removeSchedule,
  fetchAssignments,
  createAssignment,
  updateAssignment,
  removeAssignment,
  fetchSubmissions,
  fetchScheduleNotificationReads,
  markScheduleNotificationsRead,
  fetchPortalAnnouncements,
  savePortalAnnouncementApi,
  removePortalAnnouncementApi,
  downloadSubmissionFile,
  gradeSubmission
} from '../../utils/api';
import { getProfileAvatar } from '../../utils/profileAvatar';
import { SCHOOL_CLASSES } from '../../utils/schoolClasses';
import { PortalAnnouncementAttachments } from './PortalAnnouncementAttachments';
import { getActiveScheduleNotifications } from '../../utils/activeScheduleNotifications';

interface TeacherPortalProps {
  currentUser: UserAccount;
  onNavigate?: (tab: string) => void;
}

const DAYS: ScheduleItem['day'][] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const getDeadlineAfterDays = (days: number) => {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);
  deadline.setHours(23, 59, 0, 0);
  const localDeadline = new Date(deadline.getTime() - deadline.getTimezoneOffset() * 60_000);
  return localDeadline.toISOString().slice(0, 16);
};

export const TeacherPortal: React.FC<TeacherPortalProps> = ({ currentUser, onNavigate }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const teacher = teachers.find(t => t.id === currentUser.linkedId || t.nip === currentUser.username) || {
    id: currentUser.linkedId || '',
    nip: currentUser.username,
    fullName: currentUser.fullName,
    degree: '',
    subject: '',
    classesTaught: [],
    homeroomClass: '',
    education: '',
    email: currentUser.email || '',
    phone: '',
    photoUrl: currentUser.avatarUrl || '',
    bio: ''
  };

  const [activeTab, setActiveTab] = useState<'jadwal' | 'tugas' | 'kiriman' | 'pengumuman'>('jadwal');
  const [scheduleDayFilter, setScheduleDayFilter] = useState<ScheduleItem['day'] | 'Semua'>('Semua');
  const [seenScheduleNotificationKeys, setSeenScheduleNotificationKeys] = useState<string[]>([]);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [announcements, setAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [submissionLoadError, setSubmissionLoadError] = useState<string | null>(null);
  const [downloadingSubmissionId, setDownloadingSubmissionId] = useState<string | null>(null);

  // Inspect Submissions modal / panel
  const [inspectingAssignment, setInspectingAssignment] = useState<Assignment | null>(null);
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(85);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isGrading, setIsGrading] = useState<boolean>(false);

  // Forms
  const [scheduleForm, setScheduleForm] = useState<ScheduleItem>({
    id: '',
    day: 'Senin',
    startTime: '07.00',
    endTime: '08.30',
    subject: teacher.subject,
    teacherName: teacher.fullName,
    teacherId: teacher.id,
    classId: SCHOOL_CLASSES[0],
    room: '',
    colorTag: 'blue'
  });

  const [assignmentForm, setAssignmentForm] = useState<Assignment>({
    id: '',
    subject: teacher.subject,
    teacherId: teacher.id,
    teacherName: teacher.fullName,
    classId: SCHOOL_CLASSES[0],
    className: SCHOOL_CLASSES[0],
    title: '',
    description: '',
    deadline: getDeadlineAfterDays(7),
    maxScore: 100,
    createdAt: new Date().toISOString()
  });

  const [announcementForm, setAnnouncementForm] = useState<PortalAnnouncement>({
    id: '',
    title: '',
    category: 'Umum',
    content: '',
    teacherId: teacher.id,
    teacherName: teacher.fullName,
    createdAt: new Date().toISOString()
  });

  const [editingSchedule, setEditingSchedule] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [announcementImageFile, setAnnouncementImageFile] = useState<File | null>(null);
  const [announcementDocumentFile, setAnnouncementDocumentFile] = useState<File | null>(null);
  const isLoadingData = useRef(false);

  const loadData = async () => {
    if (isLoadingData.current) return;
    isLoadingData.current = true;
    try {
      try {
        const scheduleReads = await fetchScheduleNotificationReads();
        setSeenScheduleNotificationKeys(current => Array.from(new Set([...current, ...scheduleReads])));
      } catch (error) {
        console.error('Status notifikasi jadwal gagal dimuat dari server.', error);
      }
      const [backendTeachers, backendScheds, backendAsgs, backendSubs, backendAnnouncements] = await Promise.all([
        fetchTeachers(),
        fetchSchedules(),
        fetchAssignments(),
        fetchSubmissions()
          .then(result => {
            setSubmissionLoadError(null);
            return result;
          })
          .catch(error => {
            setSubmissionLoadError(error instanceof Error ? error.message : 'Kiriman siswa gagal dimuat.');
            return [];
          }),
        fetchPortalAnnouncements()
      ]);
      setTeachers(backendTeachers);
      setSchedules(backendScheds);
      setAssignments(backendAsgs);
      setSubmissions(backendSubs);
      setAnnouncements(backendAnnouncements);
    } catch {
      setSubmissionLoadError('Data portal gagal dimuat dari server. Periksa koneksi dan coba muat ulang.');
    } finally {
      isLoadingData.current = false;
    }
  };

  useEffect(() => {
    loadData();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadData();
    };
    window.addEventListener('storage-schedules-updated', refreshWhenVisible);
    window.addEventListener('storage-assignments-updated', refreshWhenVisible);
    window.addEventListener('storage-portal-announcements-updated', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const refreshTimer = window.setInterval(refreshWhenVisible, 30000);
    return () => {
      window.removeEventListener('storage-schedules-updated', refreshWhenVisible);
      window.removeEventListener('storage-assignments-updated', refreshWhenVisible);
      window.removeEventListener('storage-portal-announcements-updated', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    const clockTimer = window.setInterval(() => setClockNow(new Date()), 15_000);
    return () => window.clearInterval(clockTimer);
  }, []);

  const mySchedules = useMemo(() => schedules.filter(s => s.teacherId === teacher.id), [schedules, teacher.id]);
  const unreadActiveScheduleNotifications = getActiveScheduleNotifications(mySchedules, clockNow)
    .filter(notification => !seenScheduleNotificationKeys.includes(notification.key));
  const visibleSchedules = useMemo(
    () => scheduleDayFilter === 'Semua' ? mySchedules : mySchedules.filter(item => item.day === scheduleDayFilter),
    [mySchedules, scheduleDayFilter]
  );
  const myAssignments = useMemo(() => assignments.filter(a => a.teacherId === teacher.id), [assignments, teacher.id]);
  const mySubmissions = useMemo(
    () => submissions.filter(submission => myAssignments.some(assignment => assignment.id === submission.assignmentId)),
    [submissions, myAssignments]
  );
  const myAnnouncements = useMemo(
    () => announcements.filter(a => a.teacherId === teacher.id || !a.teacherId),
    [announcements, teacher.id]
  );

  const markActiveScheduleNotificationRead = async (key: string) => {
    setSeenScheduleNotificationKeys(current => current.includes(key) ? current : [...current, key]);
    try {
      await markScheduleNotificationsRead([key]);
    } catch (error) {
      console.error('Status notifikasi jadwal gagal disimpan ke server.', error);
    }
  };

  const resetSchedule = () => {
    setScheduleForm({
      id: '',
      day: 'Senin',
      startTime: '07.00',
      endTime: '08.30',
      subject: teacher.subject,
      teacherName: teacher.fullName,
      teacherId: teacher.id,
      classId: SCHOOL_CLASSES[0],
      room: '',
      colorTag: 'blue'
    });
    setEditingSchedule(false);
  };

  const resetAssignment = () => {
    setAssignmentForm({
      id: '',
      subject: teacher.subject,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      classId: SCHOOL_CLASSES[0],
      className: SCHOOL_CLASSES[0],
      title: '',
      description: '',
      deadline: getDeadlineAfterDays(7),
      maxScore: 100,
      createdAt: new Date().toISOString()
    });
    setEditingAssignment(false);
  };

  const setAssignmentDeadlinePreset = (days: number) => {
    setAssignmentForm(current => ({ ...current, deadline: getDeadlineAfterDays(days) }));
  };

  const resetAnnouncement = () => {
    setAnnouncementForm({
      id: '',
      title: '',
      category: 'Umum',
      content: '',
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      createdAt: new Date().toISOString()
    });
    setAnnouncementImageFile(null);
    setAnnouncementDocumentFile(null);
    setEditingAnnouncement(false);
  };

  const submitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSchedule && scheduleForm.id) {
        const updated = await updateSchedule({
          ...scheduleForm,
          teacherName: teacher.fullName,
          teacherId: teacher.id
        });
        setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else {
        const created = await createSchedule({
          ...scheduleForm,
          teacherName: teacher.fullName,
          teacherId: teacher.id
        });
        setSchedules(prev => [...prev, created]);
      }
      resetSchedule();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan jadwal.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('Hapus jadwal ini?')) return;
    try {
      await removeSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus jadwal.');
    }
  };

  const submitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.title.trim() || !assignmentForm.description.trim()) return;

    try {
      if (editingAssignment && assignmentForm.id) {
        const updated = await updateAssignment({
          ...assignmentForm,
          teacherName: teacher.fullName,
          teacherId: teacher.id
        });
        setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const created = await createAssignment({
          ...assignmentForm,
          teacherName: teacher.fullName,
          teacherId: teacher.id
        });
        setAssignments(prev => [created, ...prev]);
      }
      resetAssignment();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan tugas.');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Hapus tugas ini beserta seluruh kiriman jawaban siswa?')) return;
    try {
      await removeAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
      setSubmissions(prev => prev.filter(s => s.assignmentId !== id));
      if (inspectingAssignment?.id === id) setInspectingAssignment(null);
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus tugas.');
    }
  };

  const submitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
    try {
      const saved = await savePortalAnnouncementApi({
        ...announcementForm,
        teacherName: teacher.fullName,
        teacherId: teacher.id,
        createdAt: announcementForm.createdAt || new Date().toISOString()
      }, announcementImageFile || undefined, announcementDocumentFile || undefined);
      setAnnouncements(prev => [saved, ...prev.filter(item => item.id !== saved.id)]);
      resetAnnouncement();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menyimpan pengumuman.');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Hapus pengumuman portal ini?')) return;
    try {
      await removePortalAnnouncementApi(id);
      setAnnouncements(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menghapus pengumuman.');
    }
  };

  const handleStartGrade = (sub: AssignmentSubmission) => {
    setGradingSubId(sub.id);
    setGradeInput(sub.score !== undefined ? sub.score : 85);
    setFeedbackInput(sub.feedback || '');
  };

  const handleDownloadSubmission = async (sub: AssignmentSubmission) => {
    setDownloadingSubmissionId(sub.id);
    try {
      await downloadSubmissionFile(sub.id, sub.fileName);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Berkas tugas tidak dapat diunduh.');
    } finally {
      setDownloadingSubmissionId(null);
    }
  };

  const handleSaveGrade = async (subId: string) => {
    setIsGrading(true);
    try {
      const updated = await gradeSubmission(subId, {
        score: gradeInput,
        feedback: feedbackInput
      });
      setSubmissions(prev => prev.map(s => s.id === updated.id ? updated : s));
      setGradingSubId(null);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan penilaian.');
    } finally {
      setIsGrading(false);
    }
  };

  const startEditSchedule = (item: ScheduleItem) => {
    setScheduleForm(item);
    setEditingSchedule(true);
    setActiveTab('jadwal');
  };

  const startEditAssignment = (item: Assignment) => {
    setAssignmentForm(item);
    setEditingAssignment(true);
    setActiveTab('tugas');
  };

  const startEditAnnouncement = (item: PortalAnnouncement) => {
    setAnnouncementForm(item);
    setAnnouncementImageFile(null);
    setAnnouncementDocumentFile(null);
    setEditingAnnouncement(true);
    setActiveTab('pengumuman');
  };

  const tabs = [
    { id: 'jadwal', label: 'Jadwal Mengajar', icon: CalendarDays },
    { id: 'tugas', label: `Tugas (${myAssignments.length})`, icon: ClipboardList },
    { id: 'kiriman', label: `Kiriman Siswa (${mySubmissions.length})`, icon: FileCheck },
    { id: 'pengumuman', label: 'Pengumuman Kelas', icon: Megaphone }
  ] as const;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-3 py-6 sm:px-8 sm:py-8">
      {/* Header Profile */}
      <div className="flex min-w-0 flex-col gap-5 rounded-2xl bg-slate-900 p-4 text-white shadow-xl sm:p-8 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white border-2 border-white overflow-hidden flex items-center justify-center font-bold text-amber-300 text-xl">
            <img src={getProfileAvatar(currentUser)} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-300">Selamat datang</p>
            <h1 className="mt-0.5 break-words text-xl font-bold sm:text-3xl">{currentUser.fullName.trim() || currentUser.username}</h1>
          </div>
        </div>
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-slate-700 pt-4 text-xs md:min-w-72 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <span className="text-slate-400">NIP</span>
          <span className="break-words font-mono font-medium text-amber-300">{teacher.nip.replace(/\s+/g, '') || '—'}</span>
          <span className="text-slate-400">{teacher.subject === 'Kepala Sekolah' ? 'Jabatan' : 'Mata Pelajaran'}</span>
          <span className="break-words font-medium text-white">{teacher.subject || '—'}</span>
          <span className="text-slate-400">Kelas Wali</span>
          <span className="break-words font-medium text-white">{teacher.homeroomClass || 'Belum ditetapkan oleh admin'}</span>
        </div>
      </div>

      {/* Special Banner for Ketua KOMBEL */}
      {currentUser.role === 'ketua_kombel' && onNavigate && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 shadow-sm border border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Pengelolaan Komunitas Belajar (KOMBEL)</h4>
              <p className="text-xs text-blue-200 mt-0.5">
                Anda memiliki akses sebagai Ketua KOMBEL untuk mengelola dokumentasi kegiatan rutin dan agenda Sabtu.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('kombel')}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Buka Halaman KOMBEL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {unreadActiveScheduleNotifications.length > 0 && (
        <section aria-live="polite" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-amber-700" />
            <h2 className="text-sm font-bold text-amber-950">Jadwal mengajar sedang berlangsung</h2>
          </div>
          {unreadActiveScheduleNotifications.map(({ key, schedule }) => (
            <div key={key} className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{schedule.subject} · Kelas {schedule.classId}</p>
                <p className="mt-0.5 text-xs text-slate-600">{schedule.day}, {schedule.startTime}–{schedule.endTime}</p>
              </div>
              <button
                type="button"
                onClick={() => void markActiveScheduleNotificationRead(key)}
                className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-amber-950 transition hover:bg-amber-300"
              >
                Tandai sudah dilihat
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Tabs */}
      <div className="-mx-1 flex touch-pan-x gap-2 overflow-x-auto px-1 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'kiriman') setInspectingAssignment(null);
              }}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === tab.id ? 'bg-blue-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. JADWAL MAPEL */}
      {activeTab === 'jadwal' && (
        <section className="grid xl:grid-cols-[360px_1fr] gap-5">
          <form onSubmit={submitSchedule} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 h-fit shadow-sm">
            <div className="flex justify-between items-center border-b pb-2.5">
              <h2 className="font-bold text-base text-slate-900">{editingSchedule ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar'}</h2>
              {editingSchedule && (
                <button type="button" onClick={resetSchedule} className="text-slate-400 hover:text-slate-700">
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Hari Mengajar</label>
              <select
                className="w-full border rounded-lg p-2 text-xs"
                value={scheduleForm.day}
                onChange={e => setScheduleForm({ ...scheduleForm, day: e.target.value as ScheduleItem['day'] })}
              >
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Jam Mulai</label>
                <input
                  className="w-full border rounded-lg p-2 text-xs"
                  type="time"
                  value={scheduleForm.startTime.replace('.', ':')}
                  onChange={e => setScheduleForm({ ...scheduleForm, startTime: e.target.value.replace(':', '.') })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Jam Selesai</label>
                <input
                  className="w-full border rounded-lg p-2 text-xs"
                  type="time"
                  value={scheduleForm.endTime.replace('.', ':')}
                  onChange={e => setScheduleForm({ ...scheduleForm, endTime: e.target.value.replace(':', '.') })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Mata Pelajaran</label>
              <input
                className="w-full border rounded-lg p-2 text-xs"
                placeholder="Mata pelajaran"
                value={scheduleForm.subject}
                onChange={e => setScheduleForm({ ...scheduleForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Kelas Sasaran</label>
              <select
                className="w-full border rounded-lg p-2 text-xs"
                value={scheduleForm.classId}
                onChange={e => setScheduleForm({ ...scheduleForm, classId: e.target.value })}
              >
                {SCHOOL_CLASSES.map(classId => <option key={classId} value={classId}>{classId}</option>)}
              </select>
            </div>
            <button className="w-full rounded-lg bg-blue-900 text-white py-2 text-xs font-semibold inline-flex justify-center items-center gap-2 cursor-pointer">
              <Save size={15} /> {editingSchedule ? 'Simpan Perubahan' : 'Publikasikan Jadwal'}
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-900">Jadwal yang Anda Kelola ({mySchedules.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Siswa melihat jadwal ini otomatis sesuai kelasnya.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Filter hari</span>
                <select
                  value={scheduleDayFilter}
                  onChange={event => setScheduleDayFilter(event.target.value as typeof scheduleDayFilter)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Semua">Semua Hari</option>
                  {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                </select>
              </label>
            </div>
            <div className="divide-y text-xs">
              {visibleSchedules.length ? (
                visibleSchedules.map(item => (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="w-20 font-bold text-blue-900">{item.day}</div>
                    <div className="w-24 font-mono text-slate-500">{item.startTime}–{item.endTime}</div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{item.subject}</div>
                      <div className="text-[11px] text-slate-500">{item.classId}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEditSchedule(item)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteSchedule(item.id)} className="p-1.5 rounded hover:bg-rose-50 text-rose-600" title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-500">{mySchedules.length ? `Tidak ada jadwal mengajar pada hari ${scheduleDayFilter}.` : 'Belum ada jadwal mengajar.'}</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2. TUGAS & PENILAIAN JAWABAN SISWA */}
      {(activeTab === 'tugas' || activeTab === 'kiriman') && (
        <section className="space-y-6">
          {submissionLoadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs" role="alert">
              Kiriman siswa tidak dapat dimuat: {submissionLoadError}
            </div>
          )}
          {activeTab === 'tugas' && (
          <div className="grid xl:grid-cols-[360px_1fr] gap-5">
            {/* Create/Edit Assignment Form */}
            <form onSubmit={submitAssignment} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 h-fit shadow-sm">
              <div className="flex justify-between items-center border-b pb-2.5">
                <h2 className="font-bold text-base text-slate-900">{editingAssignment ? 'Edit Tugas' : 'Buat Tugas Baru'}</h2>
                {editingAssignment && (
                  <button type="button" onClick={resetAssignment} className="text-slate-400 hover:text-slate-700">
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Judul Tugas *</label>
                <input
                  required
                  className="w-full border rounded-lg p-2 text-xs"
                  placeholder="Contoh: Praktikum Gelombang Elektromagnetik"
                  value={assignmentForm.title}
                  onChange={e => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Kelas Target</label>
                <select
                  className="w-full border rounded-lg p-2 text-xs"
                  value={assignmentForm.classId}
                  onChange={e => setAssignmentForm({ ...assignmentForm, classId: e.target.value, className: e.target.value })}
                >
                  {SCHOOL_CLASSES.map(classId => <option key={classId} value={classId}>{classId}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Instruksi / Soal Tugas *</label>
                <textarea
                  required
                  rows={4}
                  className="w-full border rounded-lg p-2 text-xs"
                  placeholder="Deskripsikan petunjuk pengerjaan dan kriteria penilaian..."
                  value={assignmentForm.description}
                  onChange={e => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-600">Batas Waktu Pengumpulan</label>
                <input
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-700 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  type="datetime-local"
                  value={assignmentForm.deadline}
                  onChange={e => setAssignmentForm({ ...assignmentForm, deadline: e.target.value })}
                />
                <p className="text-[10px] text-slate-500">Atur tanggal dan jam, atau pilih waktu cepat:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { days: 1, label: 'Besok' },
                    { days: 3, label: '3 hari lagi' },
                    { days: 7, label: '1 minggu lagi' }
                  ].map(preset => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setAssignmentDeadlinePreset(preset.days)}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-900 transition hover:bg-blue-100"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="w-full rounded-lg bg-blue-900 text-white py-2 text-xs font-semibold inline-flex justify-center items-center gap-2 cursor-pointer">
                <Plus size={15} /> {editingAssignment ? 'Simpan Perubahan' : 'Publikasikan Tugas'}
              </button>
            </form>

            {/* Assignments List */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b">
                <h2 className="font-bold text-base text-slate-900">Tugas yang Anda Publikasikan</h2>
                <p className="text-xs text-slate-500 mt-0.5">Gunakan tombol "Kiriman Siswa" untuk membuka daftar pengumpulan pada menu khusus.</p>
              </div>
              <div className="divide-y text-xs">
                {myAssignments.length ? (
                  myAssignments.map(item => {
                    const taskSubs = submissions.filter(s => s.assignmentId === item.id);
                    const gradedCount = taskSubs.filter(s => s.status === 'Dinilai').length;
                    const isSelected = inspectingAssignment?.id === item.id;

                    return (
                      <div key={item.id} className={`p-5 space-y-2 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">{item.className}</span>
                              <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                            </div>
                            <div className="text-slate-500 text-[11px] mt-1">
                              Deadline: {item.deadline}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setInspectingAssignment(item);
                                setActiveTab('kiriman');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              <FileCheck size={14} />
                              <span>Kiriman Siswa ({taskSubs.length})</span>
                            </button>
                            <button onClick={() => startEditAssignment(item)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="Edit"><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteAssignment(item.id)} className="p-1.5 rounded hover:bg-rose-50 text-rose-600" title="Hapus"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        <p className="text-slate-600 text-[11px] line-clamp-2">{item.description}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-10 text-center text-slate-500">Belum ada tugas yang dipublikasikan.</div>
                )}
              </div>
            </div>
          </div>
          )}

          {activeTab === 'kiriman' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <label htmlFor="submission-assignment-filter" className="text-xs font-semibold text-slate-700">
                Tampilkan kiriman:
              </label>
              <select
                id="submission-assignment-filter"
                value={inspectingAssignment?.id || ''}
                onChange={event => setInspectingAssignment(myAssignments.find(item => item.id === event.target.value) || null)}
                className="w-full sm:max-w-md border rounded-lg p-2 text-xs bg-white"
              >
                <option value="">Semua tugas ({mySubmissions.length} kiriman)</option>
                {myAssignments.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({submissions.filter(sub => sub.assignmentId === item.id).length} kiriman)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student submissions */}
          {activeTab === 'kiriman' && (
            <div className="bg-white rounded-2xl border-2 border-blue-900/30 overflow-hidden shadow-md animate-in fade-in">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block">
                    Penilaian Jawaban Siswa
                  </span>
                  <h3 className="font-bold text-lg text-white mt-0.5">
                    {inspectingAssignment ? `${inspectingAssignment.title} (${inspectingAssignment.className})` : 'Semua Kiriman Siswa'}
                  </h3>
                </div>
              </div>

              {(() => {
                const subsForTask = inspectingAssignment
                  ? submissions.filter(s => s.assignmentId === inspectingAssignment.id)
                  : mySubmissions;
                if (!subsForTask.length) {
                  return (
                    <div className="p-12 text-center text-xs text-slate-500">
                      Belum ada siswa yang mengumpulkan tugas ini.
                    </div>
                  );
                }

                return (
                  <div className="divide-y text-xs">
                    {subsForTask.map(sub => {
                      const isGradingThis = gradingSubId === sub.id;
                      const hasUploadedFile = sub.submissionType === 'file' || Boolean(sub.fileName) || sub.linkOrContent.startsWith('/uploads/');
                      const assignment = myAssignments.find(item => item.id === sub.assignmentId);

                      return (
                        <div key={sub.id} className="p-5 space-y-3">
                          {!inspectingAssignment && assignment && (
                            <p className="text-[11px] font-semibold text-blue-900">{assignment.title} · {assignment.className}</p>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-sm text-slate-900">{sub.studentName}</span>
                              <span className="text-slate-500 font-mono text-[11px] ml-2">NISN: {sub.studentNisn}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                sub.status === 'Dinilai' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {sub.status}
                              </span>
                              {sub.score !== undefined && (
                                <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 text-amber-900 font-mono">
                                  Nilai: {sub.score}
                                </span>
                              )}
                              <span className="text-slate-400 font-mono text-[11px]">{sub.submittedAt}</span>
                            </div>
                          </div>

                          {hasUploadedFile ? (
                            <div className="p-3 bg-slate-50 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-slate-800 break-all">
                                  {sub.fileName || 'Berkas jawaban siswa'}
                                </p>
                                {sub.fileSize && (
                                  <p className="text-[10px] text-slate-500 mt-0.5">{sub.fileSize} byte</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDownloadSubmission(sub)}
                                disabled={downloadingSubmissionId === sub.id}
                                className="shrink-0 px-3 py-1.5 bg-blue-900 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-blue-800 disabled:opacity-50"
                              >
                                <Download size={14} />
                                {downloadingSubmissionId === sub.id ? 'Mengunduh...' : 'Unduh Berkas'}
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-lg border font-mono text-slate-800 text-[11px] whitespace-pre-line break-all">
                              {sub.linkOrContent}
                            </div>
                          )}

                          {sub.feedback && !isGradingThis && (
                            <p className="text-[11px] text-blue-900 italic">
                              Catatan Guru: "{sub.feedback}"
                            </p>
                          )}

                          {!isGradingThis ? (
                            <button
                              onClick={() => handleStartGrade(sub)}
                              className="px-3 py-1 bg-blue-900 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Award size={13} /> {sub.status === 'Dinilai' ? 'Perbarui Nilai' : 'Beri Nilai & Catatan'}
                            </button>
                          ) : (
                            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                              <div className="flex items-center gap-3">
                                <div>
                                  <label className="text-[11px] font-semibold text-slate-700 block">Nilai (0 - 100):</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={gradeInput}
                                    onChange={e => setGradeInput(Number(e.target.value))}
                                    className="w-24 px-2 py-1 text-xs border rounded bg-white font-mono"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[11px] font-semibold text-slate-700 block">Catatan / Umpan Balik untuk Siswa:</label>
                                  <input
                                    type="text"
                                    placeholder="Contoh: Penjelasan sangat baik, tingkatkan perumusan kesimpulan."
                                    value={feedbackInput}
                                    onChange={e => setFeedbackInput(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded bg-white"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isGrading}
                                  onClick={() => handleSaveGrade(sub.id)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded cursor-pointer"
                                >
                                  {isGrading ? 'Menyimpan...' : 'Simpan Penilaian'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setGradingSubId(null)}
                                  className="px-3 py-1 bg-white border text-slate-700 text-[11px] font-semibold rounded cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </section>
      )}

      {/* 3. PENGUMUMAN PORTAL */}
      {activeTab === 'pengumuman' && (
        <section className="grid xl:grid-cols-[360px_1fr] gap-5">
          <form onSubmit={submitAnnouncement} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 h-fit shadow-sm">
            <div className="flex justify-between items-center border-b pb-2.5">
              <h2 className="font-bold text-base text-slate-900">{editingAnnouncement ? 'Edit Pengumuman' : 'Pengumuman Kelas Baru'}</h2>
              {editingAnnouncement && (
                <button type="button" onClick={resetAnnouncement} className="text-slate-400 hover:text-slate-700">
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Judul Pengumuman</label>
              <input
                required
                className="w-full border rounded-lg p-2 text-xs"
                placeholder="Judul pengumuman"
                value={announcementForm.title}
                onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Kategori Sasaran</label>
              <select
                className="w-full border rounded-lg p-2 text-xs"
                value={announcementForm.category}
                onChange={e => setAnnouncementForm({ ...announcementForm, category: e.target.value as PortalAnnouncement['category'], targetClass: undefined })}
              >
                <option>Umum</option>
                <option>Kelas X</option>
                <option>Kelas XI</option>
                <option>Kelas XII</option>
              </select>
            </div>
            {announcementForm.category !== 'Umum' && (
              <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Kelas tertentu (opsional)</label>
              <select
                className="w-full border rounded-lg p-2 text-xs"
                value={announcementForm.targetClass || ''}
                onChange={e => setAnnouncementForm({ ...announcementForm, targetClass: e.target.value || undefined })}
              >
                <option value="">Semua kelas {announcementForm.category.replace('Kelas ', '')}</option>
                {SCHOOL_CLASSES.filter(classId => classId.startsWith(
                  announcementForm.category === 'Kelas X' ? 'X-' : announcementForm.category === 'Kelas XI' ? 'XI-' : 'XII-'
                )).map(classId => <option key={classId} value={classId}>{classId}</option>)}
              </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Isi Pengumuman</label>
              <textarea
                required
                rows={5}
                className="w-full border rounded-lg p-2 text-xs"
                placeholder="Isi informasi atau instruksi untuk siswa..."
                value={announcementForm.content}
                onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
              />
            </div>
            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              Foto (opsional, maksimal 10 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="w-full text-xs font-normal"
                onChange={e => setAnnouncementImageFile(e.target.files?.[0] || null)}
              />
              {announcementForm.imageName && !announcementImageFile && <span className="block font-normal text-slate-500">Foto saat ini: {announcementForm.imageName}</span>}
            </label>
            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              File (opsional, maksimal 10 MB)
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                className="w-full text-xs font-normal"
                onChange={e => setAnnouncementDocumentFile(e.target.files?.[0] || null)}
              />
              {announcementForm.fileName && !announcementDocumentFile && <span className="block font-normal text-slate-500">File saat ini: {announcementForm.fileName}</span>}
            </label>
            <button className="w-full rounded-lg bg-blue-900 text-white py-2 text-xs font-semibold inline-flex justify-center items-center gap-2 cursor-pointer">
              <Megaphone size={15} /> {editingAnnouncement ? 'Simpan Perubahan' : 'Publikasikan Pengumuman'}
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b">
              <h2 className="font-bold text-base text-slate-900">Pengumuman Internal</h2>
              <p className="text-xs text-slate-500 mt-0.5">Termasuk informasi bersama yang diterbitkan admin sekolah.</p>
            </div>
            <div className="divide-y text-xs">
              {myAnnouncements.length ? (
                myAnnouncements.map(item => (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex gap-2 items-center">
                        <span className="text-[11px] font-bold rounded-full bg-blue-50 text-blue-900 px-2 py-0.5">{item.targetClass || item.category}</span>
                        <span className="font-bold text-slate-900">{item.title}</span>
                      </div>
                      <p className="text-slate-600 mt-1 line-clamp-2">{item.content}</p>
                      <PortalAnnouncementAttachments announcement={item} />
                      <p className="mt-1 text-[11px] text-slate-400">Oleh {item.teacherName}</p>
                    </div>
                    {item.teacherId && item.teacherId === teacher.id && (
                      <div className="flex gap-1">
                        <button onClick={() => startEditAnnouncement(item)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => handleDeleteAnnouncement(item.id)} className="p-1.5 rounded hover:bg-rose-50 text-rose-600" title="Hapus"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-500">Belum ada pengumuman internal.</div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
