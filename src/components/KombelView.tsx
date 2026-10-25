import React, { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  Target,
  Sparkles,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  UserCheck
} from 'lucide-react';
import type { UserAccount, KombelActivity, KombelAgenda, KombelInfo, Teacher } from '../types';
import { DEFAULT_KOMBEL_INFO } from '../utils/kombelInfoDefaults';
import {
  fetchKombelInfo,
  updateKombelInfo,
  fetchKombelActivities,
  createKombelActivity,
  updateKombelActivity,
  removeKombelActivity,
  fetchKombelAgendas,
  createKombelAgenda,
  updateKombelAgenda,
  removeKombelAgenda,
  fileToDataUrl,
  fetchTeachers,
  updateTeacher
} from '../utils/api';

interface KombelViewProps {
  onNavigate: (tab: string) => void;
  currentUser: UserAccount | null;
}

export const KombelView: React.FC<KombelViewProps> = ({ onNavigate, currentUser }) => {
  const [activities, setActivities] = useState<KombelActivity[]>([]);
  const [agendas, setAgendas] = useState<KombelAgenda[]>([]);
  const [kombelInfo, setKombelInfo] = useState<KombelInfo>(DEFAULT_KOMBEL_INFO);
  const [coordinator, setCoordinator] = useState<Teacher | null>(null);
  const [isEditingCoordinator, setIsEditingCoordinator] = useState(false);
  const [coordinatorForm, setCoordinatorForm] = useState({ fullName: '', degree: '', education: '', bio: '', photoUrl: '' });
  const [loading, setLoading] = useState(true);

  // Management Modal state
  const isAuthorized = currentUser?.role === 'admin' || currentUser?.role === 'ketua_kombel';
  const [activeModal, setActiveModal] = useState<'none' | 'activity' | 'agenda'>('none');
  const [editingActivity, setEditingActivity] = useState<KombelActivity | null>(null);
  const [editingAgenda, setEditingAgenda] = useState<KombelAgenda | null>(null);
  const [activityImages, setActivityImages] = useState<string[]>([]);
  const [activityPhotoIndices, setActivityPhotoIndices] = useState<Record<string, number>>({});
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoForm, setInfoForm] = useState<KombelInfo>(DEFAULT_KOMBEL_INFO);
  const [infoError, setInfoError] = useState('');

  // Forms
  const [activityForm, setActivityForm] = useState({
    title: '',
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    image: '',
    description: '',
    speaker: '',
    attendeesCount: 20
  });

  const [agendaForm, setAgendaForm] = useState({
    title: '',
    date: 'Sabtu depan',
    time: '09.00 - 12.00 WIT',
    location: 'Ruang Guru SMAN 1 Halmahera Tengah',
    description: '',
    moderator: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [actData, agdData, infoData, teacherData] = await Promise.all([
        fetchKombelActivities(),
        fetchKombelAgendas(),
        fetchKombelInfo(),
        fetchTeachers()
      ]);
      setActivities(actData);
      setAgendas(agdData);
      setKombelInfo(infoData);
      setCoordinator(teacherData.find(teacher => teacher.id === 'tch-3') || null);
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Data KOMBEL gagal dimuat. Periksa koneksi server lalu coba lagi.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenInfoEditor = () => {
    setInfoForm(kombelInfo);
    setInfoError('');
    setIsInfoModalOpen(true);
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setInfoError('');
    setStatusMessage(null);
    try {
      const savedInfo = await updateKombelInfo(infoForm);
      setKombelInfo(savedInfo);
      setIsInfoModalOpen(false);
      setStatusMessage({ type: 'success', text: 'Informasi KOMBEL berhasil disimpan.' });
    } catch (err: any) {
      setInfoError(err?.message || 'Gagal menyimpan informasi KOMBEL.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinator) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const updatedCoordinator = await updateTeacher({ ...coordinator, ...coordinatorForm });
      setCoordinator(updatedCoordinator);
      setIsEditingCoordinator(false);
      setStatusMessage({ type: 'success', text: 'Profil koordinator KOMBEL berhasil diperbarui.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Gagal memperbarui profil koordinator KOMBEL.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCoordinatorEditor = () => {
    if (!coordinator) return;
    setCoordinatorForm({
      fullName: coordinator.fullName,
      degree: coordinator.degree,
      education: coordinator.education,
      bio: coordinator.bio,
      photoUrl: coordinator.photoUrl
    });
    setStatusMessage(null);
    setIsEditingCoordinator(true);
  };

  const handleCoordinatorPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatusMessage({ type: 'error', text: 'Foto profil harus berformat JPG, PNG, atau WebP.' });
      e.target.value = '';
      return;
    }
    try {
      const photoUrl = await fileToDataUrl(file);
      setCoordinatorForm(current => ({ ...current, photoUrl }));
      setStatusMessage(null);
    } catch {
      setStatusMessage({ type: 'error', text: 'Foto profil gagal dibaca. Silakan pilih ulang.' });
    }
  };

  const handleOpenAddActivity = () => {
    setEditingActivity(null);
    setActivityImages([]);
    setActivityForm({
      title: '',
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      image: '',
      description: '',
      speaker: '',
      attendeesCount: 20
    });
    setActiveModal('activity');
  };

  const handleOpenEditActivity = (item: KombelActivity) => {
    setEditingActivity(item);
    setActivityImages([item.image, ...(item.additionalImages || [])].filter(Boolean));
    setActivityForm({
      title: item.title,
      date: item.date,
      image: item.image,
      description: item.description,
      speaker: item.speaker || '',
      attendeesCount: item.attendeesCount || 20
    });
    setActiveModal('activity');
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.title || !activityForm.description) return;
    if ((!editingActivity && (activityImages.length < 3 || activityImages.length > 5)) ||
        (editingActivity && (activityImages.length < 1 || activityImages.length > 5))) {
      setStatusMessage({
        type: 'error',
        text: editingActivity
          ? 'Sisakan minimal 1 dan maksimal 5 foto dokumentasi.'
          : 'Pilih 3 sampai 5 foto untuk kegiatan baru.'
      });
      return;
    }
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      if (editingActivity) {
        const updated = await updateKombelActivity({
          ...editingActivity,
          ...activityForm,
          image: activityImages[0],
          additionalImages: activityImages.slice(1)
        });
        setActivities(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const created = await createKombelActivity({
          ...activityForm,
          image: activityImages[0],
          additionalImages: activityImages.slice(1)
        });
        setActivities(prev => [created, ...prev]);
      }
      setActiveModal('none');
      setActivityImages([]);
      setStatusMessage({ type: 'success', text: 'Data kegiatan KOMBEL berhasil disimpan.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Gagal menyimpan kegiatan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm('Hapus dokumentasi kegiatan KOMBEL ini?')) return;
    try {
      await removeKombelActivity(id);
      setActivities(prev => prev.filter(a => a.id !== id));
      setStatusMessage({ type: 'success', text: 'Dokumentasi berhasil dihapus.' });
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus kegiatan.');
    }
  };

  const handleOpenAddAgenda = () => {
    setEditingAgenda(null);
    setAgendaForm({
      title: '',
      date: 'Sabtu depan',
      time: '09.00 - 12.00 WIT',
      location: 'Ruang Guru SMAN 1 Halmahera Tengah',
      description: '',
      moderator: ''
    });
    setActiveModal('agenda');
  };

  const handleOpenEditAgenda = (item: KombelAgenda) => {
    setEditingAgenda(item);
    setAgendaForm({
      title: item.title,
      date: item.date,
      time: item.time,
      location: item.location,
      description: item.description,
      moderator: item.moderator || ''
    });
    setActiveModal('agenda');
  };

  const handleSaveAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaForm.title || !agendaForm.date) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      if (editingAgenda) {
        const updated = await updateKombelAgenda({ ...editingAgenda, ...agendaForm });
        setAgendas(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const created = await createKombelAgenda(agendaForm);
        setAgendas(prev => [created, ...prev]);
      }
      setActiveModal('none');
      setStatusMessage({ type: 'success', text: 'Agenda KOMBEL berhasil diperbarui.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Gagal menyimpan agenda.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgenda = async (id: string) => {
    if (!window.confirm('Hapus agenda ini?')) return;
    try {
      await removeKombelAgenda(id);
      setAgendas(prev => prev.filter(a => a.id !== id));
      setStatusMessage({ type: 'success', text: 'Agenda berhasil dihapus.' });
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus agenda.');
    }
  };

  const handleActivityFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (activityImages.length + files.length > 5) {
      alert('Dokumentasi maksimal 5 foto. Hapus foto lama sebelum menambahkan pengganti.');
      e.target.value = '';
      return;
    }
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) ||
        files.reduce((total, file) => total + file.size, 0) > 8 * 1024 * 1024) {
      alert('Gunakan foto JPG, PNG, atau WebP dengan ukuran total maksimal 8 MB.');
      e.target.value = '';
      return;
    }
    try {
      const addedImages = await Promise.all(files.map(fileToDataUrl));
      setActivityImages(current => [...current, ...addedImages]);
      e.target.value = '';
    } catch {
      alert('Foto kegiatan gagal dibaca. Silakan pilih ulang.');
      e.target.value = '';
    }
  };

  const moveActivityPhoto = (activity: KombelActivity, direction: -1 | 1) => {
    const photoCount = 1 + (activity.additionalImages?.length || 0);
    setActivityPhotoIndices(current => ({
      ...current,
      [activity.id]: ((current[activity.id] || 0) + direction + photoCount) % photoCount
    }));
  };

  const renderActivityCarousel = (activity: KombelActivity) => {
    const images = [activity.image, ...(activity.additionalImages || [])].filter(Boolean);
    const index = Math.min(activityPhotoIndices[activity.id] || 0, images.length - 1);
    return (
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
        <img src={images[index] || activity.image} alt={activity.title} className="h-full w-full object-cover" />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => moveActivityPhoto(activity, -1)}
              aria-label="Foto KOMBEL sebelumnya"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => moveActivityPhoto(activity, 1)}
              aria-label="Foto KOMBEL berikutnya"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[11px] font-mono text-white">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>
    );
  };

  const latestActivity = activities[0];
  const otherActivities = activities.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-16 space-y-12">
      {/* Breadcrumb & Hero Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 uppercase tracking-widest">
          <button onClick={() => onNavigate('beranda')} className="hover:underline">Beranda</button>
          <span>/</span>
          <span className="text-slate-500">Komunitas Belajar</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-slate-900">
              KOMBEL — Komunitas Belajar Guru
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              “Belajar bersama, berbagi praktik baik, meningkatkan kualitas pembelajaran.”
            </p>
          </div>

          {isAuthorized && (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-blue-100 text-blue-900 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Akses Pengelola: {currentUser.role === 'ketua_kombel' ? 'Ketua KOMBEL' : 'Admin'}</span>
              </span>
              <button
                onClick={handleOpenAddActivity}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Dokumentasi</span>
              </button>
              <button
                onClick={handleOpenAddAgenda}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Agenda</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-xs font-medium ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
          {statusMessage.type === 'error' && (
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="ml-auto shrink-0 rounded-md border border-rose-300 px-3 py-1.5 font-semibold hover:bg-rose-100 disabled:opacity-50"
            >
              {loading ? 'Memuat...' : 'Coba lagi'}
            </button>
          )}
        </div>
      )}

      {/* Routine Infographic Strip */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif-title text-xl font-bold text-slate-900">Informasi Komunitas Belajar</h2>
          {isAuthorized && (
            <button
              type="button"
              onClick={handleOpenInfoEditor}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-blue-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 sm:self-auto"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Informasi KOMBEL
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="bg-gradient-to-br from-blue-950 to-blue-900 text-white p-6 rounded-2xl shadow-md border border-blue-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-800/80 text-amber-300 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 block">Jadwal Rutin</span>
            <h3 className="font-bold text-lg text-white mt-0.5">{kombelInfo.routineTitle}</h3>
            <p className="text-xs text-blue-200 mt-1 leading-relaxed">{kombelInfo.routineDescription}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Tempat Pelaksanaan</span>
            <h3 className="font-bold text-lg text-slate-900 mt-0.5">{kombelInfo.venueTitle}</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{kombelInfo.venueDescription}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Tujuan Utama</span>
            <h3 className="font-bold text-lg text-slate-900 mt-0.5">{kombelInfo.purposeTitle}</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{kombelInfo.purposeDescription}</p>
          </div>
        </div>
        </div>
      </section>

      {coordinator && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-900">Pengelola Komunitas</span>
            <h2 className="font-serif-title text-lg font-bold text-slate-900 mt-1">Profil Koordinator KOMBEL</h2>
            </div>
            {isAuthorized && !isEditingCoordinator && (
              <button
                type="button"
                onClick={handleOpenCoordinatorEditor}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-900 hover:text-blue-900"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Profil
              </button>
            )}
          </div>
          {isEditingCoordinator ? (
            <form onSubmit={handleSaveCoordinator} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
              <div className="flex items-center gap-3 sm:col-span-2">
                <img src={coordinatorForm.photoUrl || '/FotoKepsek.jpg'} alt="Pratinjau foto koordinator" className="h-16 w-16 rounded-lg bg-slate-100 object-cover object-top" />
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  Foto Profil (JPG, PNG, WebP)
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoordinatorPhotoChange} className="block max-w-full text-xs font-normal text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:font-semibold file:text-blue-900" />
                </label>
              </div>
              <label className="space-y-1 text-xs font-semibold text-slate-700">Nama
                <input required value={coordinatorForm.fullName} onChange={e => setCoordinatorForm({ ...coordinatorForm, fullName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">Gelar
                <input value={coordinatorForm.degree} onChange={e => setCoordinatorForm({ ...coordinatorForm, degree: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">Pendidikan
                <input value={coordinatorForm.education} onChange={e => setCoordinatorForm({ ...coordinatorForm, education: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">Profil Singkat
                <textarea rows={3} value={coordinatorForm.bio} onChange={e => setCoordinatorForm({ ...coordinatorForm, bio: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={() => setIsEditingCoordinator(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Batal</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}</button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-5 sm:p-5">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-24 sm:w-24">
                <img src={coordinator.photoUrl || '/FotoKepsek.jpg'} alt={coordinator.fullName} className="h-full w-full object-cover object-top" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <div>
                  <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-900">Koordinator KOMBEL</span>
                  <h3 className="mt-1.5 text-base font-bold text-slate-900">{coordinator.fullName}</h3>
                  <p className="text-xs text-slate-500">{coordinator.degree}</p>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{coordinator.bio}</p>
                <p className="text-[11px] text-slate-500">Pendidikan: {coordinator.education}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Featured Latest Activity & Next Agenda Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Latest Activity */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="font-serif-title text-xl font-bold text-slate-900">Kegiatan Terbaru KOMBEL</h2>
            </div>
            {latestActivity && isAuthorized && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditActivity(latestActivity)}
                  className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded-md"
                  title="Edit kegiatan ini"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteActivity(latestActivity.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                  title="Hapus kegiatan ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border">Memuat kegiatan KOMBEL...</div>
          ) : latestActivity ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="relative">
                {renderActivityCarousel(latestActivity)}
                <div className="absolute top-3 left-3 px-3 py-1 bg-blue-900/90 text-white rounded-full text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-amber-300" />
                  <span>{latestActivity.date}</span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <h3 className="font-serif-title text-xl font-bold text-slate-900 leading-tight">
                  {latestActivity.title}
                </h3>
                {latestActivity.speaker && (
                  <p className="text-xs text-blue-900 font-semibold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Narasumber / Fasilitator: {latestActivity.speaker}</span>
                  </p>
                )}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {latestActivity.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-xs text-slate-500 bg-white rounded-2xl border">
              Belum ada dokumentasi kegiatan KOMBEL.
            </div>
          )}
        </div>

        {/* Right: Agenda Minggu Depan */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-900" />
              <h2 className="font-serif-title text-xl font-bold text-slate-900">Agenda Pertemuan Pekanan</h2>
            </div>
            {isAuthorized && (
              <button
                onClick={handleOpenAddAgenda}
                className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            )}
          </div>

          <div className="space-y-3">
            {agendas.length ? (
              agendas.map(agenda => (
                <div key={agenda.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2 hover:border-blue-900/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded">
                      {agenda.date}
                    </span>
                    {isAuthorized && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleOpenEditAgenda(agenda)} className="p-1 text-slate-400 hover:text-blue-900"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteAgenda(agenda.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{agenda.title}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {agenda.time}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {agenda.location}</span>
                  </div>
                  {agenda.description && (
                    <p className="text-xs text-slate-600 pt-1 leading-relaxed">{agenda.description}</p>
                  )}
                  {agenda.moderator && (
                    <p className="text-[11px] text-blue-900 font-medium">Koordinator: {agenda.moderator}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border">
                Belum ada agenda terdaftar untuk minggu depan.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Archive / Previous KOMBEL Activities */}
      {otherActivities.length > 0 && (
        <section className="space-y-5 pt-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="font-serif-title text-xl font-bold text-slate-900">Arsip Dokumentasi Kegiatan Sebelumnya</h2>
            <p className="text-xs text-slate-500 mt-0.5">Catatan visual dan resume materi pelatihan para guru di KOMBEL.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherActivities.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="relative">
                    {renderActivityCarousel(item)}
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white rounded text-[11px] font-mono">
                      {item.date}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.title}</h4>
                    {item.speaker && (
                      <p className="text-[11px] text-blue-900 font-semibold">{item.speaker}</p>
                    )}
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{item.description}</p>
                  </div>
                </div>

                {isAuthorized && (
                  <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                    <button
                      onClick={() => handleOpenEditActivity(item)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-100 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteActivity(item.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 rounded transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {isInfoModalOpen && isAuthorized && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kombel-info-title"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 sm:items-center sm:p-4"
        >
          <div className="my-4 w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl sm:my-8 sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 id="kombel-info-title" className="font-bold text-base text-slate-900">Ubah Informasi KOMBEL</h3>
                <p className="mt-1 text-xs text-slate-500">Perubahan akan tampil di halaman KOMBEL.</p>
              </div>
              <button type="button" onClick={() => setIsInfoModalOpen(false)} aria-label="Tutup" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveInfo} className="space-y-4">
              {([
                ['routineTitle', 'Judul jadwal rutin', 'Contoh: Setiap Sabtu'],
                ['routineDescription', 'Keterangan jadwal rutin', 'Tuliskan waktu dan keterangan pertemuan rutin.'],
                ['venueTitle', 'Tempat pelaksanaan', 'Nama tempat kegiatan'],
                ['venueDescription', 'Keterangan tempat', 'Alamat atau fasilitas tempat pelaksanaan.'],
                ['purposeTitle', 'Tujuan utama', 'Contoh: Mutu Pembelajaran'],
                ['purposeDescription', 'Keterangan tujuan utama', 'Tuliskan tujuan kegiatan KOMBEL.']
              ] as const).map(([key, label, placeholder]) => {
                const multiline = key.endsWith('Description');
                return (
                  <div key={key} className="space-y-1">
                    <label htmlFor={`kombel-info-${key}`} className="text-xs font-semibold text-slate-700">{label} *</label>
                    {multiline ? (
                      <textarea
                        id={`kombel-info-${key}`}
                        required
                        maxLength={1000}
                        rows={3}
                        value={infoForm[key]}
                        onChange={e => setInfoForm({ ...infoForm, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    ) : (
                      <input
                        id={`kombel-info-${key}`}
                        type="text"
                        required
                        maxLength={120}
                        value={infoForm[key]}
                        onChange={e => setInfoForm({ ...infoForm, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    )}
                  </div>
                );
              })}
              {infoError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{infoError}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsInfoModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                  <Save className="h-4 w-4" />{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {activeModal === 'activity' && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingActivity ? 'Edit Dokumentasi Kegiatan' : 'Tambah Dokumentasi Kegiatan KOMBEL'}
              </h3>
              <button onClick={() => setActiveModal('none')} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Judul Kegiatan / Topik Bahasan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Workshop Modul Ajar Berdiferensiasi"
                  value={activityForm.title}
                  onChange={e => setActivityForm({ ...activityForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tanggal Pelaksanaan</label>
                  <input
                    type="text"
                    value={activityForm.date}
                    onChange={e => setActivityForm({ ...activityForm, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Narasumber / Fasilitator</label>
                  <input
                    type="text"
                    placeholder="Contoh: Lukman Hi. Saleh, S.Pd"
                    value={activityForm.speaker}
                    onChange={e => setActivityForm({ ...activityForm, speaker: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  {editingActivity ? 'Kelola Foto Dokumentasi (1–5 foto)' : 'Unggah 3–5 Foto Kegiatan'}
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleActivityFilesChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                />
                <p className="text-[11px] text-slate-500">
                  {editingActivity
                    ? 'Hapus foto dengan tombol × pada pratinjau, lalu unggah foto pengganti. Maksimal 5 foto.'
                    : 'Pilih 3 sampai 5 foto. Ukuran total maksimal 8 MB.'}
                </p>
                {activityImages.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto py-1">
                    {activityImages.map((image, index) => (
                      <div key={`${editingActivity?.id || 'new'}-${index}`} className="relative h-16 w-24 shrink-0">
                        <img
                          src={image}
                          alt={`Pratinjau foto kegiatan ${index + 1}`}
                          className="h-full w-full rounded-lg border border-slate-200 object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Hapus foto dokumentasi ${index + 1}`}
                          title="Hapus foto ini"
                          onClick={() => setActivityImages(current => current.filter((_, photoIndex) => photoIndex !== index))}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-sm font-bold leading-none text-white shadow hover:bg-rose-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Ringkasan / Notulensi Kegiatan *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Jelaskan ringkasan bahasan, hasil diskusi, dan praktik baik yang disepakati..."
                  value={activityForm.description}
                  onChange={e => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kegiatan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agenda Modal */}
      {activeModal === 'agenda' && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingAgenda ? 'Edit Agenda KOMBEL' : 'Tambah Agenda Minggu Depan'}
              </h3>
              <button onClick={() => setActiveModal('none')} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveAgenda} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Judul Kegiatan / Topik Agenda *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bedah Soal SAS & Refleksi Pembelajaran"
                  value={agendaForm.title}
                  onChange={e => setAgendaForm({ ...agendaForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tanggal Pelaksanaan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sabtu, 24 Oktober 2026"
                    value={agendaForm.date}
                    onChange={e => setAgendaForm({ ...agendaForm, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Waktu / Jam Pelaksanaan</label>
                  <input
                    type="text"
                    value={agendaForm.time}
                    onChange={e => setAgendaForm({ ...agendaForm, time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Lokasi / Ruang Pertemuan</label>
                <input
                  type="text"
                  value={agendaForm.location}
                  onChange={e => setAgendaForm({ ...agendaForm, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Koordinator / Moderator</label>
                <input
                  type="text"
                  placeholder="Contoh: Lukman Hi. Saleh, S.Pd (Ketua KOMBEL)"
                  value={agendaForm.moderator}
                  onChange={e => setAgendaForm({ ...agendaForm, moderator: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Deskripsi Ringkas</label>
                <textarea
                  rows={3}
                  placeholder="Hal-hal yang perlu disiapkan oleh guru..."
                  value={agendaForm.description}
                  onChange={e => setAgendaForm({ ...agendaForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Agenda'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
