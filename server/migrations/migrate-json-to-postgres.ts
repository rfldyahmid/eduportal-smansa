/**
 * Migrator satu kali: data/db.json -> PostgreSQL.
 *
 * Cara pakai (dari folder proyek):
 *   npm i pg && npm i -D @types/pg
 *   DATABASE_URL=postgres://user:pass@host:5432/dbname \
 *     npx tsx server/migrations/migrate-json-to-postgres.ts --dry-run
 *
 * Opsi:
 *   --dry-run                           Jalankan semua INSERT lalu ROLLBACK (tidak ada yang tersimpan).
 *   --source <path>                     Default: data/db.json
 *   --report <path>                     Default: migration-report.json
 *   --force-password-change-for-defaults
 *                                       Akun yang masih memakai kata sandi bawaan diberi
 *                                       must_change_password = true.
 *
 * Aturan keselamatan:
 *   - File JSON hanya dibaca, tidak pernah ditulis atau dihapus.
 *   - Berjalan dalam satu transaksi: gagal di tengah jalan = tidak ada data yang masuk.
 *   - Menolak berjalan jika tabel tujuan sudah berisi data.
 *   - Laporan hanya memuat jumlah baris dan ID, tidak memuat nilai pribadi.
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { verifyPassword } from '../auth';
import { DEFAULT_CONTACT_INFO } from '../../src/utils/contactInfoDefaults';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const opt = (name: string, fallback: string) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const SOURCE = path.resolve(opt('--source', path.join(ROOT, 'data', 'db.json')));
const REPORT = path.resolve(opt('--report', path.join(ROOT, 'migration-report.json')));
const DRY_RUN = flag('--dry-run');
const FORCE_PW_CHANGE = flag('--force-password-change-for-defaults');
const UPLOAD_DIR = path.join(path.dirname(SOURCE), 'uploads');
const DEFAULT_OFFSET = '+09:00'; // Asia/Jayapura (WIT)

type Row = Record<string, unknown>;
const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

// ---------------------------------------------------------------------------
// Nilai yang diizinkan (cermin dari CHECK pada 001_initial_schema.sql)
// ---------------------------------------------------------------------------
const ENUMS = {
  major: ['MIPA', 'IPS', 'Fase E (Umum)'],
  gender: ['Laki-laki', 'Perempuan'],
  department: ['MIPA', 'Bahasa', 'IPS', 'Seni & Olahraga', 'BK', 'Informatika'],
  role: ['siswa', 'guru', 'admin', 'kepala_sekolah', 'ketua_kombel'],
  day: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  track: ['Zonasi', 'Prestasi Akademik', 'Prestasi Non-Akademik', 'Afirmasi', 'Pindah Tugas'],
  ppdbStatus: ['Menunggu Verifikasi', 'Berkas Terverifikasi', 'Lulus Seleksi', 'Cadangan', 'Tidak Diterima'],
  msgStatus: ['Baru', 'Dibaca', 'Dibalas'],
  annCategory: ['Akademik', 'Prestasi', 'PPDB', 'Kegiatan', 'Umum'],
  galCategory: ['Akademik', 'Prestasi', 'Ekstrakurikuler', 'Olahraga', 'Sosialisasi', 'Upacara'],
  vidCategory: ['Kegiatan', 'Prestasi', 'Pembelajaran', 'Profil', 'Umum'],
  subType: ['file', 'link', 'text'],
  subStatus: ['Terkumpul', 'Terlambat', 'Dinilai'],
  portalCategory: ['Umum', 'Kelas X', 'Kelas XI', 'Kelas XII']
};

function checkEnum(kind: keyof typeof ENUMS, value: unknown, where: string): string {
  if (typeof value !== 'string' || !ENUMS[kind].includes(value)) {
    err(`${where}: nilai ${kind} "${String(value)}" tidak ada dalam daftar (${ENUMS[kind].join(' | ')}).`);
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Parser tanggal/waktu format Indonesia
// ---------------------------------------------------------------------------
const MONTHS: Record<string, number> = {
  januari: 1, jan: 1, februari: 2, pebruari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5,
  juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8, september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, november: 11, nopember: 11, nov: 11, desember: 12, des: 12
};
const ZONES: Record<string, string> = { WIT: '+09:00', WITA: '+08:00', WIB: '+07:00', Z: '+00:00' };
const pad = (n: number | string, l = 2) => String(n).padStart(l, '0');

function validYmd(y: number, m: number, d: number) {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

interface Parsed { date: string; time: string | null; offset: string | null }

/** Mengenali: ISO ('2026-09-15 08:30 WIT', '2026-10-25T23:59'), '28 September 2026',
 *  'Sabtu, 24 Oktober 2026', dan '21 Okt 2026, 09.47 WIT'. Selain itu -> null. */
function parseDateTime(raw: unknown): Parsed | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  let y: number, mo: number, d: number, hh: string | null = null, mi = '00', ss = '00', zone: string | null = null;

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?\s*(Z|[+-]\d{2}:?\d{2}|WIT|WITA|WIB)?$/i);
  if (m) {
    y = +m[1]; mo = +m[2]; d = +m[3];
    if (m[4] !== undefined) { hh = pad(m[4]); mi = m[5]; ss = m[6] ?? '00'; }
    zone = m[7] ?? null;
  } else {
    m = s.match(/^(?:[A-Za-z'’]+,\s*)?(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})(?:,?\s+(?:pukul\s+)?(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?)?\s*(WIT|WITA|WIB)?$/i);
    if (!m) return null;
    const month = MONTHS[m[2].toLowerCase()];
    if (!month) return null;
    y = +m[3]; mo = month; d = +m[1];
    if (m[4] !== undefined) { hh = pad(m[4]); mi = m[5]; ss = m[6] ?? '00'; }
    zone = m[7] ?? null;
  }
  if (!validYmd(y, mo, d)) return null;
  if (hh !== null && (+hh > 23 || +mi > 59 || +ss > 59)) return null;

  let offset: string | null = null;
  if (zone) {
    const up = zone.toUpperCase();
    offset = ZONES[up] ?? `${zone.slice(0, 3)}:${zone.slice(-2)}`;
  }
  return { date: `${y}-${pad(mo)}-${pad(d)}`, time: hh === null ? null : `${hh}:${mi}:${ss}`, offset };
}

const toDate = (raw: unknown) => parseDateTime(raw)?.date ?? null;
function toTs(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return new Date(raw).toISOString();
  const p = parseDateTime(raw);
  return p ? `${p.date}T${p.time ?? '00:00:00'}${p.offset ?? DEFAULT_OFFSET}` : null;
}
function toTime(raw: unknown): string | null {
  const m = typeof raw === 'string' ? raw.trim().match(/^(\d{1,2})[.:](\d{2})/) : null;
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return `${pad(m[1])}:${m[2]}`;
}

// ---------------------------------------------------------------------------
// Utilitas validasi
// ---------------------------------------------------------------------------
const str = (v: unknown, fallback = '') => (v === undefined || v === null ? fallback : String(v));
const nz = (v: unknown) => (v === undefined || v === null || v === '' ? null : v);

function required(where: string, field: string, v: unknown): string {
  if (v === undefined || v === null || String(v).trim() === '') {
    err(`${where}: kolom ${field} wajib terisi.`);
    return '';
  }
  return String(v);
}
function findDuplicates<T>(items: T[], key: (x: T) => string | null, label: string, idOf: (x: T) => string) {
  const seen = new Map<string, string>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    const prev = seen.get(k);
    if (prev) err(`Duplikat ${label}: ${idOf(it)} dan ${prev} memakai nilai yang sama.`);
    else seen.set(k, idOf(it));
  }
}

const uploadRefs: { owner: string; url: string }[] = [];
function trackUpload(owner: string, url: unknown) {
  if (typeof url === 'string' && url.startsWith('/uploads/')) uploadRefs.push({ owner, url });
}

// ---------------------------------------------------------------------------
// Tahap 1: baca JSON dan susun baris yang akan dimasukkan (tanpa menyentuh database)
// ---------------------------------------------------------------------------
async function buildPlan() {
  const raw = JSON.parse(await fs.readFile(SOURCE, 'utf8'));
  const arr = (k: string): any[] => (Array.isArray(raw[k]) ? raw[k] : []);
  const src = {
    users: arr('users'), students: arr('students'), teachers: arr('teachers'), schedules: arr('schedules'),
    ppdb: arr('ppdb'), messages: arr('messages'), announcements: arr('announcements'), gallery: arr('gallery'),
    videos: arr('videos'), kombelActivities: arr('kombelActivities'), kombelAgendas: arr('kombelAgendas'),
    assignments: arr('assignments'), submissions: arr('submissions'),
    portalAnnouncements: arr('portalAnnouncements'), passwordResets: arr('passwordResets'),
    contactInfo: { ...DEFAULT_CONTACT_INFO, ...(raw.contactInfo || {}) }
  };

  // Sama seperti ensureDefaults() di server/db.ts: wali kelas diturunkan dari data siswa
  // bila guru belum punya homeroomClass dan hanya ada satu kelas yang cocok.
  for (const t of src.teachers) {
    if (typeof t.homeroomClass === 'string') continue;
    const classes = new Set(src.students.filter(s => s.homeroomTeacher === t.fullName).map(s => s.classId));
    if (classes.size === 1) t.homeroomClass = [...classes][0];
  }

  // Duplikat ID dan nilai unik
  for (const k of ['users', 'students', 'teachers', 'schedules', 'ppdb', 'messages', 'announcements', 'gallery',
    'videos', 'kombelActivities', 'kombelAgendas', 'assignments', 'submissions', 'portalAnnouncements',
    'passwordResets'] as const) {
    findDuplicates(src[k], x => x.id ?? null, `ID di ${k}`, x => String(x.id));
  }
  findDuplicates(src.teachers, x => x.nip ?? null, 'NIP guru', x => x.id);
  findDuplicates(src.students, x => x.nisn ?? null, 'NISN siswa', x => x.id);
  findDuplicates(src.students, x => x.nis ?? null, 'NIS siswa', x => x.id);
  findDuplicates(src.users, x => (x.username ? String(x.username).toLowerCase() : null), 'username (tanpa beda huruf)', x => x.id);
  findDuplicates(src.users, x => (x.email ? String(x.email).toLowerCase() : null), 'email akun (tanpa beda huruf)', x => x.id);
  findDuplicates(src.ppdb, x => x.registrationNumber ?? null, 'nomor pendaftaran PPDB', x => x.id);
  findDuplicates(src.teachers, x => x.homeroomClass || null, 'wali kelas untuk satu kelas', x => x.id);

  const teacherById = new Map(src.teachers.map(t => [t.id, t]));
  const studentById = new Map(src.students.map(s => [s.id, s]));
  const assignmentById = new Map(src.assignments.map(a => [a.id, a]));

  // --- Kelas: dikumpulkan dari semua tempat yang menyebut classId
  const classes = new Map<string, { id: string; name: string; major: string | null; academic_year: string | null }>();
  const addClass = (id: unknown, name?: unknown, major?: unknown, year?: unknown) => {
    if (typeof id !== 'string' || !id.trim()) return;
    const cur = classes.get(id);
    const hasName = typeof name === 'string' && name.trim() && name !== id;
    if (!cur) {
      classes.set(id, {
        id, name: hasName ? String(name) : id,
        major: typeof major === 'string' && ENUMS.major.includes(major) ? major : null,
        academic_year: typeof year === 'string' ? year : null
      });
    } else {
      if (hasName && cur.name === id) cur.name = String(name);
      if (!cur.major && typeof major === 'string' && ENUMS.major.includes(major)) cur.major = major;
      if (!cur.academic_year && typeof year === 'string') cur.academic_year = year;
    }
  };
  for (const s of src.students) addClass(s.classId, s.className, s.major, s.academicYear);
  for (const t of src.teachers) { (t.classesTaught || []).forEach((c: string) => addClass(c)); addClass(t.homeroomClass); }
  for (const x of src.schedules) addClass(x.classId);
  for (const a of src.assignments) addClass(a.classId, a.className);
  for (const s of src.submissions) addClass(s.classId);
  for (const p of src.portalAnnouncements) addClass(p.targetClass);

  const plan: Record<string, Row[]> = {};
  const add = (table: string, row: Row) => { (plan[table] ||= []).push(row); };

  for (const c of classes.values()) add('school_classes', c);

  // --- Guru
  for (const t of src.teachers) {
    const w = `teachers/${t.id}`;
    add('teachers', {
      id: t.id, nip: required(w, 'nip', t.nip), full_name: required(w, 'fullName', t.fullName),
      degree: str(t.degree), subject: str(t.subject), department: checkEnum('department', t.department, w),
      education: str(t.education), email: str(t.email), phone: str(t.phone), photo_url: str(t.photoUrl),
      bio: str(t.bio), homeroom_class_id: nz(t.homeroomClass)
    });
    trackUpload(w, t.photoUrl);
    for (const c of new Set<string>(t.classesTaught || [])) add('teacher_classes', { teacher_id: t.id, class_id: c });
  }

  // --- Siswa (nama wali kelas dicocokkan persis; kalau tidak cocok, teks aslinya tetap disimpan)
  const teacherByName = new Map<string, any[]>();
  for (const t of src.teachers) teacherByName.set(t.fullName, [...(teacherByName.get(t.fullName) || []), t]);
  for (const s of src.students) {
    const w = `students/${s.id}`;
    const candidates = teacherByName.get(s.homeroomTeacher) || [];
    let homeroomId: string | null = null;
    if (candidates.length === 1) homeroomId = candidates[0].id;
    else if (s.homeroomTeacher) warn(`${w}: nama wali kelas tidak cocok dengan tepat satu guru; homeroom_teacher_id dikosongkan, teks asli disimpan.`);
    add('students', {
      id: s.id, nisn: required(w, 'nisn', s.nisn), nis: required(w, 'nis', s.nis),
      full_name: required(w, 'fullName', s.fullName), gender: checkEnum('gender', s.gender, w),
      class_id: required(w, 'classId', s.classId), major: checkEnum('major', s.major, w),
      academic_year: required(w, 'academicYear', s.academicYear),
      homeroom_teacher_id: homeroomId, homeroom_teacher_legacy: nz(s.homeroomTeacher)
    });
  }

  // --- Akun
  const defaultPwCandidates: Record<string, string[]> = {
    admin: [process.env.ADMIN_PASSWORD || '', 'admin123'].filter(Boolean),
    kepala_sekolah: ['kepsek123'], ketua_kombel: ['kombel123', 'guru123'], guru: ['guru123'], siswa: ['siswa123']
  };
  const defaultPwRisk: { id: string; role: string; forcedChange: boolean }[] = [];
  for (const u of src.users) {
    const w = `users/${u.id}`;
    const role = checkEnum('role', u.role, w);
    let studentId: string | null = null, teacherId: string | null = null;
    if (u.linkedId) {
      if (role === 'siswa') {
        if (studentById.has(u.linkedId)) studentId = u.linkedId; else err(`${w}: linkedId ${u.linkedId} tidak ada di students.`);
      } else if (teacherById.has(u.linkedId)) teacherId = u.linkedId;
      else err(`${w}: linkedId ${u.linkedId} tidak ada di teachers.`);
    } else if (role !== 'admin') warn(`${w}: akun ${role} tanpa linkedId.`);

    let mustChange = Boolean(u.mustChangePassword);
    const usesDefault = (defaultPwCandidates[role] || []).some(p => {
      try { return verifyPassword(p, u.salt, u.passwordHash); } catch { return false; }
    });
    if (usesDefault) {
      defaultPwRisk.push({ id: u.id, role, forcedChange: mustChange });
      if (FORCE_PW_CHANGE) mustChange = true;
    }
    add('users', {
      id: u.id, username: required(w, 'username', u.username), password_hash: required(w, 'passwordHash', u.passwordHash),
      salt: required(w, 'salt', u.salt), role, full_name: required(w, 'fullName', u.fullName), email: str(u.email),
      avatar_url: nz(u.avatarUrl), student_id: studentId, teacher_id: teacherId, must_change_password: mustChange
    });
    trackUpload(w, u.avatarUrl);
  }

  // --- Jadwal
  for (const x of src.schedules) {
    const w = `schedules/${x.id}`;
    const start = toTime(x.startTime), end = toTime(x.endTime);
    if (!start || !end) err(`${w}: jam "${x.startTime}" / "${x.endTime}" tidak dapat dibaca.`);
    else if (end <= start) err(`${w}: jam selesai harus setelah jam mulai.`);
    if (x.teacherId && !teacherById.has(x.teacherId)) err(`${w}: teacherId ${x.teacherId} tidak ada di teachers.`);
    add('schedules', {
      id: x.id, day: checkEnum('day', x.day, w), start_time: start, end_time: end,
      subject: required(w, 'subject', x.subject), teacher_id: nz(x.teacherId), teacher_name_legacy: nz(x.teacherName),
      class_id: required(w, 'classId', x.classId), room: str(x.room), color_tag: str(x.colorTag), updated_at: toTs(x.updatedAt)
    });
  }

  // --- PPDB
  let maxReg = 0;
  for (const p of src.ppdb) {
    const w = `ppdb/${p.id}`;
    const registered = toTs(p.registeredAt);
    if (!registered) err(`${w}: registeredAt "${p.registeredAt}" tidak dapat dibaca.`);
    const score = Number(p.averageReportScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) err(`${w}: averageReportScore di luar 0-100.`);
    const reg = String(p.registrationNumber || '').match(/(\d+)$/);
    if (reg) maxReg = Math.max(maxReg, +reg[1]);
    add('ppdb_applicants', {
      id: p.id, registration_number: required(w, 'registrationNumber', p.registrationNumber),
      nisn: required(w, 'nisn', p.nisn), nik: required(w, 'nik', p.nik), full_name: required(w, 'fullName', p.fullName),
      gender: checkEnum('gender', p.gender, w), birth_place_date: str(p.birthPlaceDate), phone: str(p.phone),
      email: str(p.email), address: str(p.address), previous_school: str(p.previousSchool),
      track: checkEnum('track', p.track, w), average_report_score: score,
      status: checkEnum('ppdbStatus', p.status, w), registered_at: registered, committee_notes: nz(p.committeeNotes)
    });
  }

  // --- Pesan kontak
  for (const m of src.messages) {
    const w = `messages/${m.id}`;
    const created = toTs(m.createdAt);
    if (!created) err(`${w}: createdAt "${m.createdAt}" tidak dapat dibaca.`);
    let repliedAt: string | null = null;
    if (m.repliedAt) { repliedAt = toTs(m.repliedAt); if (!repliedAt) err(`${w}: repliedAt "${m.repliedAt}" tidak dapat dibaca.`); }
    add('contact_messages', {
      id: m.id, name: required(w, 'name', m.name), email: str(m.email), phone: str(m.phone), subject: str(m.subject),
      message: required(w, 'message', m.message), created_at: created, status: checkEnum('msgStatus', m.status, w),
      reply_message: nz(m.replyMessage), replied_at: repliedAt, replied_by: nz(m.repliedBy)
    });
  }

  // --- Info kontak (satu baris; nilai bawaan dipakai jika db.json belum menyimpannya)
  const ci = src.contactInfo as Record<string, string>;
  add('contact_info', {
    id: 1, address: ci.address, phone: ci.phone, whatsapp: ci.whatsapp, public_email: ci.publicEmail,
    ppdb_email: ci.ppdbEmail, weekday_hours: ci.weekdayHours, friday_hours: ci.fridayHours,
    footer_hours: ci.footerHours, instagram_url: ci.instagramUrl, facebook_url: ci.facebookUrl, youtube_url: ci.youtubeUrl
  });

  // Tanggal tampilan -> date. Jika teksnya tidak dikenali, pakai tanggal createdAt dan beri peringatan.
  const dateWithFallback = (w: string, label: unknown, createdAt: unknown): string | null => {
    const d = toDate(label);
    if (d) return d;
    const fb = toDate(createdAt);
    if (fb) { warn(`${w}: tanggal "${String(label)}" tidak dikenali; memakai tanggal createdAt (${fb}). Teks asli disimpan di date_label.`); return fb; }
    err(`${w}: tanggal "${String(label)}" tidak dikenali dan tidak ada createdAt sebagai cadangan.`);
    return null;
  };
  const createdAtOrNull = (w: string, v: unknown) => {
    if (v === undefined || v === null || v === '') return null;
    const t = toTs(v);
    if (!t) err(`${w}: createdAt "${String(v)}" tidak dapat dibaca.`);
    return t;
  };
  const createdAtRequired = (w: string, v: unknown) => {
    const t = toTs(v);
    if (!t) err(`${w}: createdAt "${String(v)}" tidak dapat dibaca atau kosong.`);
    return t;
  };

  // --- Pengumuman sekolah (gambar utama = posisi 0)
  for (const a of src.announcements) {
    const w = `announcements/${a.id}`;
    add('announcements', {
      id: a.id, title: required(w, 'title', a.title), category: checkEnum('annCategory', a.category, w),
      published_on: dateWithFallback(w, a.date, a.createdAt), date_label: nz(a.date), author: required(w, 'author', a.author),
      summary: required(w, 'summary', a.summary), content: required(w, 'content', a.content),
      created_at: createdAtOrNull(w, a.createdAt), is_important: Boolean(a.isImportant)
    });
    const imgs: string[] = [...(Array.isArray(a.images) ? a.images : [])];
    if (a.image && !imgs.includes(a.image)) imgs.unshift(a.image);
    imgs.forEach((url, i) => { add('announcement_images', { announcement_id: a.id, position: i, image_url: url }); trackUpload(w, url); });
  }

  // --- Galeri
  for (const g of src.gallery) {
    const w = `gallery/${g.id}`;
    add('gallery_photos', {
      id: g.id, title: required(w, 'title', g.title), category: checkEnum('galCategory', g.category, w),
      published_on: dateWithFallback(w, g.date, g.createdAt), date_label: nz(g.date), image_url: required(w, 'image', g.image),
      description: str(g.description), photographer: str(g.photographer), created_at: createdAtOrNull(w, g.createdAt)
    });
    trackUpload(w, g.image);
    (g.additionalImages || []).forEach((url: string, i: number) => {
      add('gallery_photo_images', { gallery_photo_id: g.id, position: i, image_url: url }); trackUpload(w, url);
    });
  }

  // --- Video
  for (const v of src.videos) {
    const w = `videos/${v.id}`;
    add('youtube_videos', {
      id: v.id, title: required(w, 'title', v.title), category: checkEnum('vidCategory', v.category, w),
      youtube_url: required(w, 'youtubeUrl', v.youtubeUrl), video_id: required(w, 'videoId', v.videoId),
      thumbnail_url: str(v.thumbnailUrl), description: str(v.description),
      published_on: dateWithFallback(w, v.date, v.createdAt), date_label: nz(v.date), created_at: createdAtRequired(w, v.createdAt)
    });
  }

  // --- KOMBEL
  for (const k of src.kombelActivities) {
    const w = `kombelActivities/${k.id}`;
    add('kombel_activities', {
      id: k.id, title: required(w, 'title', k.title), activity_date: dateWithFallback(w, k.date, k.createdAt), date_label: nz(k.date),
      image_url: required(w, 'image', k.image), description: required(w, 'description', k.description),
      speaker: nz(k.speaker), attendees_count: k.attendeesCount === undefined ? null : Number(k.attendeesCount),
      created_at: createdAtRequired(w, k.createdAt)
    });
    trackUpload(w, k.image);
    (k.additionalImages || []).forEach((url: string, i: number) => {
      add('kombel_activity_images', { activity_id: k.id, position: i, image_url: url }); trackUpload(w, url);
    });
  }
  for (const k of src.kombelAgendas) {
    const w = `kombelAgendas/${k.id}`;
    add('kombel_agendas', {
      id: k.id, title: required(w, 'title', k.title), agenda_date: dateWithFallback(w, k.date, k.createdAt), date_label: nz(k.date),
      agenda_time: str(k.time), location: str(k.location), description: str(k.description),
      moderator: nz(k.moderator), created_at: createdAtRequired(w, k.createdAt)
    });
  }

  // --- Tugas dan pengumpulan
  for (const a of src.assignments) {
    const w = `assignments/${a.id}`;
    if (!teacherById.has(a.teacherId)) err(`${w}: teacherId ${a.teacherId} tidak ada di teachers.`);
    const deadline = toTs(a.deadline);
    if (!deadline) err(`${w}: deadline "${a.deadline}" tidak dapat dibaca.`);
    add('assignments', {
      id: a.id, subject: required(w, 'subject', a.subject), teacher_id: a.teacherId, class_id: required(w, 'classId', a.classId),
      title: required(w, 'title', a.title), description: str(a.description), deadline,
      max_score: Number(a.maxScore), attachment_name: nz(a.attachmentName), created_at: createdAtRequired(w, a.createdAt)
    });
  }
  for (const s of src.submissions) {
    const w = `submissions/${s.id}`;
    if (!assignmentById.has(s.assignmentId)) err(`${w}: assignmentId ${s.assignmentId} tidak ada di assignments.`);
    if (!studentById.has(s.studentId)) err(`${w}: studentId ${s.studentId} tidak ada di students (pengumpulan oleh akun non-siswa?).`);
    const submitted = toTs(s.submittedAt);
    if (!submitted) err(`${w}: submittedAt "${s.submittedAt}" tidak dapat dibaca.`);
    let gradedAt: string | null = null;
    if (s.gradedAt) { gradedAt = toTs(s.gradedAt); if (!gradedAt) err(`${w}: gradedAt "${s.gradedAt}" tidak dapat dibaca.`); }
    add('assignment_submissions', {
      id: s.id, assignment_id: s.assignmentId, student_id: s.studentId, student_name: str(s.studentName),
      student_nisn: str(s.studentNisn), class_id: required(w, 'classId', s.classId), submitted_at: submitted,
      submission_type: checkEnum('subType', s.submissionType, w), file_name: nz(s.fileName), file_size: nz(s.fileSize),
      link_or_content: required(w, 'linkOrContent', s.linkOrContent), status: checkEnum('subStatus', s.status, w),
      score: s.score === undefined || s.score === null ? null : Number(s.score), feedback: nz(s.feedback),
      graded_at: gradedAt, graded_by: nz(s.gradedBy)
    });
    if (s.submissionType === 'file') trackUpload(w, s.linkOrContent);
  }
  findDuplicates(src.submissions, x => `${x.assignmentId}|${x.studentId}`, 'pengumpulan (tugas + siswa)', x => x.id);

  // --- Pengumuman portal
  for (const p of src.portalAnnouncements) {
    const w = `portalAnnouncements/${p.id}`;
    if (p.teacherId && !teacherById.has(p.teacherId)) err(`${w}: teacherId ${p.teacherId} tidak ada di teachers.`);
    add('portal_announcements', {
      id: p.id, title: required(w, 'title', p.title), category: checkEnum('portalCategory', p.category, w),
      target_class: nz(p.targetClass), content: required(w, 'content', p.content), teacher_id: p.teacherId || null,
      teacher_name_legacy: nz(p.teacherName), created_at: createdAtRequired(w, p.createdAt), is_important: Boolean(p.isImportant)
    });
  }

  // --- Token reset: hanya yang masih aktif; token mentah di-hash (sha256)
  let skippedResets = 0;
  const userIds = new Set(src.users.map(u => u.id));
  for (const r of src.passwordResets) {
    if (r.used || !(Number(r.expiresAt) > Date.now())) { skippedResets++; continue; }
    if (!userIds.has(r.userId)) { err(`passwordResets/${r.id}: userId ${r.userId} tidak ada di users.`); continue; }
    add('password_reset_requests', {
      id: r.id, user_id: r.userId, username: str(r.username),
      token_hash: crypto.createHash('sha256').update(String(r.token)).digest('hex'),
      expires_at: new Date(Number(r.expiresAt)).toISOString(), used: false, requested_at: toTs(r.requestedAt)
    });
  }

  // --- Berkas unggahan yang dirujuk tetapi tidak ada di data/uploads
  const missingUploads = uploadRefs.filter(r => !existsSync(path.join(UPLOAD_DIR, path.basename(r.url))));
  if (missingUploads.length) warn(`${missingUploads.length} berkas di /uploads dirujuk data tetapi tidak ditemukan di ${UPLOAD_DIR}.`);

  const expected: Record<string, number> = {};
  for (const [t, rows] of Object.entries(plan)) expected[t] = rows.length;
  return { plan, expected, src, maxReg, defaultPwRisk, missingUploads, skippedResets };
}

// Urutan INSERT mengikuti relasi (induk lebih dulu)
const ORDER = [
  'school_classes', 'teachers', 'teacher_classes', 'students', 'users', 'schedules', 'ppdb_applicants',
  'contact_messages', 'contact_info', 'announcements', 'announcement_images', 'gallery_photos', 'gallery_photo_images',
  'youtube_videos', 'kombel_activities', 'kombel_activity_images', 'kombel_agendas', 'assignments',
  'assignment_submissions', 'portal_announcements', 'password_reset_requests'
];

async function insertRow(c: pg.Client | pg.PoolClient, table: string, row: Row) {
  const cols = Object.keys(row);
  await c.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
    cols.map(k => row[k])
  );
}

async function main() {
  console.log(`Sumber : ${SOURCE}`);
  console.log(`Mode   : ${DRY_RUN ? 'DRY-RUN (di-rollback)' : 'MIGRASI (di-commit jika semua lolos)'}`);

  const { plan, expected, maxReg, defaultPwRisk, missingUploads, skippedResets } = await buildPlan();
  const report: Record<string, unknown> = {
    generatedAt: new Date().toISOString(), source: SOURCE, dryRun: DRY_RUN, committed: false,
    expectedRows: expected, errors, warnings
  };
  const writeReport = () => fs.writeFile(REPORT, JSON.stringify(report, null, 2), 'utf8');

  if (errors.length) {
    console.error(`\nDitemukan ${errors.length} masalah yang harus diperbaiki sebelum migrasi:`);
    errors.forEach(e => console.error(`  x ${e}`));
    await writeReport();
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL belum diatur.'); process.exit(1); }
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    const v = await client.query(`SELECT max(version) AS v FROM schema_migrations`).catch(() => null);
    if (!v || Number(v.rows[0].v) < 2) throw new Error('Skema belum lengkap: jalankan 001_initial_schema.sql lalu 002_review_fixes.sql lebih dulu.');
    for (const t of ['users', 'teachers', 'students', 'announcements', 'school_classes', 'ppdb_applicants', 'contact_info']) {
      const n = Number((await client.query(`SELECT count(*) AS n FROM ${t}`)).rows[0].n);
      if (n > 0) throw new Error(`Tabel ${t} sudah berisi ${n} baris. Migrator hanya berjalan ke database kosong.`);
    }

    await client.query('BEGIN');
    for (const t of ORDER) for (const row of plan[t] || []) {
      try { await insertRow(client, t, row); }
      catch (e: any) { throw new Error(`INSERT ke ${t} gagal (id=${String(row.id ?? '-')}): ${e.message}`); }
    }
    await client.query(`SELECT setval('ppdb_registration_seq', $1, $2)`, [Math.max(maxReg, 1), maxReg > 0]);

    // Verifikasi jumlah baris
    const actual: Record<string, number> = {};
    const mismatches: string[] = [];
    for (const t of ORDER) {
      actual[t] = Number((await client.query(`SELECT count(*) AS n FROM ${t}`)).rows[0].n);
      if (actual[t] !== (expected[t] || 0)) mismatches.push(`${t}: rencana ${expected[t] || 0}, tersimpan ${actual[t]}`);
    }
    report.actualRows = actual;
    if (mismatches.length) throw new Error(`Jumlah baris tidak cocok: ${mismatches.join('; ')}`);

    // Verifikasi relasi: tidak boleh ada akun yang kehilangan profil tertaut
    const orphan = await client.query(
      `SELECT count(*) AS n FROM users WHERE role <> 'admin' AND student_id IS NULL AND teacher_id IS NULL`);
    if (Number(orphan.rows[0].n) > 0) warn(`${orphan.rows[0].n} akun non-admin tidak tertaut ke profil siswa/guru.`);

    if (DRY_RUN) { await client.query('ROLLBACK'); console.log('\nDRY-RUN selesai: semua INSERT lolos, lalu di-rollback.'); }
    else { await client.query('COMMIT'); report.committed = true; console.log('\nMigrasi selesai dan di-commit.'); }
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => { });
    console.error(`\nGAGAL, semua perubahan dibatalkan: ${e.message}`);
    report.fatal = e.message;
    await writeReport();
    await client.end();
    process.exit(1);
  }
  await client.end();

  report.defaultPasswordAccounts = {
    total: defaultPwRisk.length,
    stillLoginWithDefaultWithoutForcedChange: defaultPwRisk.filter(a => !a.forcedChange && !FORCE_PW_CHANGE).map(a => ({ id: a.id, role: a.role })),
    forcedToChangeOnFirstLogin: defaultPwRisk.filter(a => a.forcedChange || FORCE_PW_CHANGE).length
  };
  report.missingUploads = missingUploads;
  report.resetTokensSkipped = skippedResets;
  await writeReport();

  console.log('\nTabel'.padEnd(28) + 'Baris');
  for (const t of ORDER) console.log(`  ${t.padEnd(26)}${expected[t] || 0}`);
  if (warnings.length) { console.log(`\nPeringatan (${warnings.length}):`); warnings.forEach(w => console.log(`  ! ${w}`)); }
  if (defaultPwRisk.length) {
    const risky = defaultPwRisk.filter(a => !a.forcedChange && !FORCE_PW_CHANGE);
    console.log(`\n${defaultPwRisk.length} akun masih memakai kata sandi bawaan.`);
    if (risky.length) {
      console.log(`${risky.length} di antaranya tidak diwajibkan ganti sandi saat login. Ganti sandi akun tersebut sebelum dipublikasikan`);
      console.log('(atau jalankan ulang dengan --force-password-change-for-defaults).');
    } else {
      console.log('Semuanya diwajibkan ganti sandi saat login pertama, tetapi sandi bawaan tetap berlaku sampai saat itu.');
      console.log('Untuk akun admin, kepala sekolah, dan ketua KOMBEL, ganti sandinya langsung sebelum situs dipublikasikan.');
    }
  }
  console.log(`\nLaporan: ${REPORT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
