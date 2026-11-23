import React, { useEffect, useState } from 'react';
import { Announcement, PpdbWebsiteInfo, UserAccount } from '../../types';
import { createAnnouncement, fetchAnnouncements, fetchPpdbWebsiteInfo, fileToDataUrl, removeAnnouncement, updateAnnouncement, updatePpdbWebsiteInfo } from '../../utils/api';
import { DEFAULT_PPDB_WEBSITE_INFO } from '../../utils/ppdbInfoDefaults';
import { Bell, ExternalLink, Facebook, ImagePlus, Pencil, Save, Trash2, X } from 'lucide-react';

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const todayInput = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};
const toDateInput = (value?: string) => {
  if (!value) return todayInput();
  const iso = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const match = value.match(/^(\d{1,2})\s+([\p{L}]+)\s+(\d{4})$/u);
  if (!match) return todayInput();
  const month = monthNames.findIndex(item => item.toLowerCase() === match[2].toLowerCase()) + 1;
  return month ? `${match[3]}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}` : todayInput();
};
const toDateLabel = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return `${day} ${monthNames[month - 1]} ${year}`;
};

interface KombelWebsiteManagerProps { currentUser: UserAccount; }

export const KombelWebsiteManager: React.FC<KombelWebsiteManagerProps> = ({ currentUser }) => {
  const [section, setSection] = useState<'ppdb' | 'announcements'>('ppdb');
  const [ppdbInfo, setPpdbInfo] = useState<PpdbWebsiteInfo>(DEFAULT_PPDB_WEBSITE_INFO);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [noticeForm, setNoticeForm] = useState({
    title: '', category: 'Umum' as Announcement['category'], date: todayInput(), author: currentUser.fullName,
    summary: '', content: '', facebookUrl: '', images: [] as string[]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [info, items] = await Promise.all([fetchPpdbWebsiteInfo(), fetchAnnouncements()]);
      setPpdbInfo(info);
      setAnnouncements(items.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()));
    } catch (err: any) {
      setError(err?.message || 'Informasi website gagal dimuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const savePpdb = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = await updatePpdbWebsiteInfo(ppdbInfo);
      setPpdbInfo(saved);
      setMessage('Informasi PPDB berhasil diperbarui.');
      window.dispatchEvent(new Event('ppdb-website-info-updated'));
    } catch (err: any) {
      setError(err?.message || 'Informasi PPDB gagal disimpan.');
    } finally { setSaving(false); }
  };

  const resetNoticeForm = () => {
    setEditing(null);
    setNoticeForm({ title: '', category: 'Umum', date: todayInput(), author: currentUser.fullName, summary: '', content: '', facebookUrl: '', images: [] });
  };

  const editNotice = (item: Announcement) => {
    setEditing(item);
    setNoticeForm({
      title: item.title, category: item.category, date: toDateInput(item.date), author: item.author,
      summary: item.summary, content: item.content, facebookUrl: item.facebookUrl || '',
      images: item.images?.length ? item.images : item.image ? [item.image] : []
    });
    setMessage(''); setError('');
  };

  const handleNoticeImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;
    if (noticeForm.images.length + files.length > 5) {
      setError('Foto pengumuman maksimal 5. Hapus foto yang tidak diperlukan sebelum menambah foto lain.');
      return;
    }
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError('Gunakan foto JPG, PNG, atau WebP dengan ukuran maksimal 5 MB per foto.');
      return;
    }
    setError('');
    try {
      const images = await Promise.all(files.map(fileToDataUrl));
      setNoticeForm(current => ({ ...current, images: [...current.images, ...images] }));
    } catch (err: any) {
      setError(err?.message || 'Foto gagal dibaca. Silakan pilih ulang.');
    }
  };

  const saveNotice = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const payload = { ...noticeForm, date: toDateLabel(noticeForm.date), author: noticeForm.author.trim() || currentUser.fullName };
      const saved = editing
        ? await updateAnnouncement({ ...editing, ...payload })
        : await createAnnouncement({ ...payload, createdAt: new Date().toISOString() });
      setAnnouncements(current => [saved, ...current.filter(item => item.id !== saved.id)].sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()));
      resetNoticeForm();
      setMessage(editing ? 'Pengumuman berhasil diperbarui.' : 'Pengumuman berhasil diterbitkan di beranda.');
      window.dispatchEvent(new Event('storage-announcements-updated'));
    } catch (err: any) {
      setError(err?.message || 'Pengumuman gagal disimpan.');
    } finally { setSaving(false); }
  };

  const deleteNotice = async (item: Announcement) => {
    if (!window.confirm(`Hapus pengumuman “${item.title}”?`)) return;
    try {
      await removeAnnouncement(item.id);
      setAnnouncements(current => current.filter(entry => entry.id !== item.id));
      setMessage('Pengumuman berhasil dihapus.');
      window.dispatchEvent(new Event('storage-announcements-updated'));
    } catch (err: any) { setError(err?.message || 'Pengumuman gagal dihapus.'); }
  };

  const updatePath = (index: number, field: keyof PpdbWebsiteInfo['paths'][number], value: string) => setPpdbInfo(current => ({
    ...current, paths: current.paths.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
  }));
  const updateStage = (index: number, field: keyof PpdbWebsiteInfo['stages'][number], value: string) => setPpdbInfo(current => ({
    ...current, stages: current.stages.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
  }));

  return <section className="space-y-5">
    <header className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-950 to-blue-900 p-5 text-white sm:p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Kelola Informasi Website</p>
      <h2 className="mt-1 text-xl font-bold sm:text-2xl">PPDB & Pengumuman Beranda</h2>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-blue-100">Perubahan PPDB tampil di halaman PPDB. Pengumuman yang diterbitkan tampil pada bagian Pengumuman Terbaru di beranda.</p>
    </header>

    <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
      <button type="button" onClick={() => setSection('ppdb')} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-semibold ${section === 'ppdb' ? 'bg-blue-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}><Pencil size={15} /> Informasi PPDB</button>
      <button type="button" onClick={() => setSection('announcements')} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-semibold ${section === 'announcements' ? 'bg-blue-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}><Bell size={15} /> Pengumuman Beranda</button>
    </div>

    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">{error}</p>}
    {loading ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">Memuat informasi website...</div> : section === 'ppdb' ? (
      <form onSubmit={savePpdb} className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <label className="mb-2 block text-xs font-bold text-slate-800">Deskripsi halaman PPDB</label>
          <textarea required rows={3} maxLength={1200} value={ppdbInfo.introduction} onChange={event => setPpdbInfo(current => ({ ...current, introduction: event.target.value }))} className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {ppdbInfo.paths.map((path, index) => <fieldset key={index} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <legend className="px-1 text-sm font-bold text-blue-950">Jalur Pendaftaran {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {([['label', 'Label jalur'], ['title', 'Judul jalur'], ['quota', 'Kuota'] ] as const).map(([field, label]) => <label key={field} className="space-y-1 text-xs font-semibold text-slate-700">{label}<input required value={path[field]} onChange={event => updatePath(index, field, event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>)}
            </div>
            <label className="block space-y-1 text-xs font-semibold text-slate-700">Deskripsi<textarea required rows={3} value={path.description} onChange={event => updatePath(index, 'description', event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
            <label className="block space-y-1 text-xs font-semibold text-slate-700">Persyaratan<input required value={path.requirement} onChange={event => updatePath(index, 'requirement', event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
          </fieldset>)}
        </div>
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div><h3 className="font-bold text-slate-900">Jadwal & Tahapan PPDB</h3><p className="mt-1 text-[11px] text-slate-500">Gunakan {`{tahun}`} pada tanggal agar tahun akademik diperbarui otomatis.</p></div>
          {ppdbInfo.stages.map((stage, index) => <fieldset key={index} className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <legend className="text-xs font-bold text-blue-900">Tahap {index + 1}</legend>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Label<input required value={stage.label} onChange={event => updateStage(index, 'label', event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Nama tahap<input required value={stage.title} onChange={event => updateStage(index, 'title', event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Tanggal<input required value={stage.date} onChange={event => updateStage(index, 'date', event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Keterangan<input required value={stage.description} onChange={event => updateStage(index, 'description', event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
          </fieldset>)}
        </div>
        <button disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 text-sm font-semibold text-white disabled:opacity-60"><Save size={16} />{saving ? 'Menyimpan...' : 'Simpan Informasi PPDB'}</button>
      </form>
    ) : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]">
      <form onSubmit={saveNotice} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-slate-900">{editing ? 'Edit Pengumuman' : 'Buat Pengumuman'}</h3>{editing && <button type="button" onClick={resetNoticeForm} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Batal edit</button>}</div>
        <label className="block space-y-1 text-xs font-semibold text-slate-700">Judul<input required maxLength={200} value={noticeForm.title} onChange={event => setNoticeForm(current => ({ ...current, title: event.target.value }))} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-xs font-semibold text-slate-700">Kategori<select value={noticeForm.category} onChange={event => setNoticeForm(current => ({ ...current, category: event.target.value as Announcement['category'] }))} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 font-normal">{['Akademik', 'Prestasi', 'PPDB', 'Kegiatan', 'Umum'].map(category => <option key={category}>{category}</option>)}</select></label>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">Tanggal<input type="date" required value={noticeForm.date} onChange={event => setNoticeForm(current => ({ ...current, date: event.target.value }))} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
        </div>
        <label className="block space-y-1 text-xs font-semibold text-slate-700">Penulis<input required value={noticeForm.author} onChange={event => setNoticeForm(current => ({ ...current, author: event.target.value }))} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
        <label className="block space-y-1 text-xs font-semibold text-slate-700">Ringkasan beranda<textarea required rows={2} value={noticeForm.summary} onChange={event => setNoticeForm(current => ({ ...current, summary: event.target.value }))} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
        <label className="block space-y-1 text-xs font-semibold text-slate-700">Isi pengumuman<textarea required rows={4} value={noticeForm.content} onChange={event => setNoticeForm(current => ({ ...current, content: event.target.value }))} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
        <label className="block space-y-1 text-xs font-semibold text-slate-700">Tautan Facebook (opsional)<input type="url" inputMode="url" placeholder="https://www.facebook.com/..." value={noticeForm.facebookUrl} onChange={event => setNoticeForm(current => ({ ...current, facebookUrl: event.target.value }))} className="w-full rounded-lg border border-slate-300 p-2.5 font-normal" /><span className="block text-[11px] font-normal text-slate-500">Pengunjung yang membuka pengumuman ini akan langsung diarahkan ke Facebook.</span></label>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Foto pengumuman (opsional, 1–5 foto)</label>
          <p className="text-[11px] text-slate-500">Format JPG, PNG, atau WebP; maksimal 5 MB per foto.</p>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-900 hover:bg-blue-100">
            <ImagePlus size={15} /> Pilih foto
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleNoticeImages} className="sr-only" />
          </label>
          {noticeForm.images.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {noticeForm.images.map((image, index) => <div key={`${image.slice(0, 40)}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <img src={image} alt={`Pratinjau foto pengumuman ${index + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => setNoticeForm(current => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }))} aria-label={`Hapus foto ${index + 1}`} className="absolute right-1 top-1 rounded-full bg-slate-950/75 p-1.5 text-white hover:bg-rose-700"><X size={14} /></button>
            </div>)}
          </div>}
          <p className="text-[11px] text-slate-500">{noticeForm.images.length} dari 5 foto dipilih.</p>
        </div>
        <button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white disabled:opacity-60"><Save size={15} />{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Terbitkan di Beranda'}</button>
      </form>
      <div className="space-y-3">
        <h3 className="font-bold text-slate-900">Pengumuman website</h3>
        {announcements.slice(0, 12).map(item => <article key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{item.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.summary}</p>{item.facebookUrl && <a href={item.facebookUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700"><Facebook size={13} /> Facebook <ExternalLink size={11} /></a>}</div>
          <div className="flex shrink-0 gap-1"><button type="button" aria-label={`Edit ${item.title}`} onClick={() => editNotice(item)} className="rounded-lg p-2 text-blue-800 hover:bg-blue-50"><Pencil size={15} /></button><button type="button" aria-label={`Hapus ${item.title}`} onClick={() => void deleteNotice(item)} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50"><Trash2 size={15} /></button></div>
        </article>)}
        {!announcements.length && <p className="rounded-xl border border-dashed p-6 text-center text-xs text-slate-500">Belum ada pengumuman.</p>}
      </div>
    </div>}
  </section>;
};
