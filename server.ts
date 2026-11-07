
import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import nodemailer from 'nodemailer';
import type { Express } from 'express';
import { getDb, saveDb, resetSchoolData } from './server/db';
import { pool } from './server/pg';
import { isSchoolClass, normalizeSchoolClassId } from './src/utils/schoolClasses';
import { registerAnnouncementRoutes } from './server/routes/announcements';
import { countAnnouncements, createAnnouncement } from './server/repositories/announcements';
import {
  hashPassword,
  generateSalt,
  verifyPassword,
  createToken,
  requireAuth,
  requireAdmin,
  requireAdminOrKombel,
  requireAdminOrTeacher,
  requireStaff,
  type AuthenticatedRequest
} from './server/auth';
import type {
  GalleryPhoto,
  YouTubeVideo,
  KombelActivity,
  KombelAgenda,
  KombelInfo,
  Teacher,
  Student,
  ScheduleItem,
  PPDBApplicant,
  ContactMessage,
  ContactInfo,
  Assignment,
  AssignmentSubmission,
  PortalAnnouncement,
  UserAccount,
  UserRole,
  PasswordResetRequest
} from './src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
// Ensure the uploads directory exists
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => { });
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const configuredJwtSecret = process.env.ADMIN_SECRET || process.env.JWT_SECRET || '';
const hasPlaceholderSecret = /^(ganti|change|your|example|placeholder)/i.test(configuredJwtSecret);

if (
  IS_PRODUCTION &&
  (configuredJwtSecret.length < 32 || hasPlaceholderSecret)
) {
  throw new Error('ADMIN_SECRET atau JWT_SECRET acak minimal 32 karakter wajib diatur untuk production; nilai contoh tidak boleh digunakan.');
}

const app = express();
app.use(express.json({ limit: '36mb' }));
app.get('/uploads/:filename', async (req, res, next) => {
  const filename = path.basename(req.params.filename);
  if (filename !== req.params.filename) return res.status(404).end();
  return sendUploadedFile(filename, res, next);
});

async function sendUploadedFile(filename: string, res: import('express').Response, next?: import('express').NextFunction) {
  const { rows } = await pool.query<{ mime_type: string; original_name: string; content: Buffer }>(
    'SELECT mime_type, original_name, content FROM uploaded_files WHERE id = $1', [filename]
  );
  if (rows[0]) {
    res.type(rows[0].mime_type).set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(rows[0].original_name)}`);
    return res.send(rows[0].content);
  }
  return res.sendFile(path.join(UPLOAD_DIR, filename), error => {
    if (error && !res.headersSent) {
      if (next) return next(error);
      res.status((error as Error & { statusCode?: number }).statusCode || 404).end();
    }
  });
}


// Frontend serving (Vite dev middleware / dist in production).
// - Vite middleware handles module requests (/src/*.tsx, /@vite/*, /@react-refresh, CSS, assets).
// - index.html is NEVER served raw in development: it must pass through
//   vite.transformIndexHtml(), which injects the React Refresh preamble.
//   (Serving it via express.static/sendFile caused "@vitejs/plugin-react can't detect preamble".)
// - The SPA fallback is registered at the very END of this file, after all /api routes.
const DIST_DIR = path.resolve(ROOT, 'dist');
let vite: import('vite').ViteDevServer | undefined;

// Never expose backend source, data files (password hashes) or config over HTTP.
const BLOCKED_PATH = /^\/(server\.ts|server\.js|server(\/|$)|data(\/|$)|package(-lock)?\.json|tsconfig\.json|vite\.config\.ts|\.env|\.git)/i;
app.use((req, res, next) => {
  let decoded = req.path;
  try { decoded = decodeURIComponent(req.path); } catch { /* keep raw */ }
  if (BLOCKED_PATH.test(decoded) && !decoded.startsWith('/uploads/')) {
    return res.status(404).json({ message: 'Tidak ditemukan.' });
  }
  next();
});

if (!IS_PRODUCTION) {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    root: ROOT,
  });
  app.use(vite.middlewares);
} else {
  // index: false so that "/" goes through the SPA fallback below.
  app.use(express.static(DIST_DIR, { index: false }));
}

// Configure multer for file uploads (max 20MB, PDF/Word only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  }
});

// Robust in-memory rate limiter for failed login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const publicActionAttempts = new Map<string, { count: number; resetAt: number }>();

function consumePublicActionLimit(key: string, maximum: number, windowMs: number): boolean {
  const now = Date.now();
  const record = publicActionAttempts.get(key);
  if (!record || record.resetAt <= now) {
    publicActionAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (record.count >= maximum) return true;
  record.count += 1;
  return false;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function matchesSha256(value: string, expectedHash: unknown): boolean {
  if (typeof expectedHash !== 'string' || !/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
  const actual = Buffer.from(sha256(value), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function isRateLimited(ip: string, maxFailures = 20, windowMs = 15 * 60 * 1000): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return false;
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || record.resetAt < now) return false;
  return record.count >= maxFailures;
}

function recordLoginFailure(ip: string, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || record.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
  } else {
    record.count += 1;
  }
}

function recordLoginSuccess(ip: string) {
  loginAttempts.delete(ip);
}

function cleanBase64Image(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('data:image/')) {
    throw new Error('Gambar harus berupa data URL image.');
  }
  const match = value.match(/^data:image\/(png|jpeg|jpg|webp);base64,([\s\S]+)$/);
  if (!match) throw new Error('Format gambar yang didukung: JPG, PNG, WEBP.');
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const cleanData = match[2].replace(/\s/g, '');
  const buffer = Buffer.from(cleanData, 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
    throw new Error('Ukuran gambar maksimal 5 MB.');
  }
  return { ext, buffer };
}

async function persistImage(dataUrl: string, prefix: string): Promise<string> {
  const { ext, buffer } = cleanBase64Image(dataUrl);
  const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  await pool.query(
    'INSERT INTO uploaded_files (id, original_name, mime_type, size_bytes, content) VALUES ($1, $2, $3, $4, $5)',
    [filename, filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`, buffer.length, buffer]
  );
  return `/uploads/${filename}`;
}

async function persistUploadedFile(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).replace(/[^.a-zA-Z0-9]/g, '').slice(0, 16);
  const filename = `submission-${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
  await pool.query(
    'INSERT INTO uploaded_files (id, original_name, mime_type, size_bytes, content) VALUES ($1, $2, $3, $4, $5)',
    [filename, path.basename(file.originalname), file.mimetype, file.size, file.buffer]
  );
  return `/uploads/${filename}`;
}

async function safeDeleteImage(imagePath?: string) {
  if (!imagePath || typeof imagePath !== 'string' || !imagePath.startsWith('/uploads/')) return;
  try {
    const filename = path.basename(imagePath);
    const resolved = path.resolve(UPLOAD_DIR, filename);
    if (resolved.startsWith(path.resolve(UPLOAD_DIR))) {
      await pool.query('DELETE FROM uploaded_files WHERE id = $1', [filename]);
      await fs.rm(resolved, { force: true }).catch(() => { });
    }
  } catch {
    // Ignore unlink error
  }
}

function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

// ----------------------------------------------------
// 1. HEALTH & SYSTEM STATUS
// ----------------------------------------------------
app.get('/api/health', async (_req, res) => {
  const [db, announcementCount] = await Promise.all([getDb(), countAnnouncements()]);
  res.json({
    ok: true,
    name: 'SMAN 1 Halmahera Tengah API',
    database: 'PostgreSQL',
    announcements: announcementCount,
    gallery: db.gallery.length,
    videos: db.videos.length,
    kombelActivities: db.kombelActivities.length,
    teachers: db.teachers.length,
    students: db.students.length,
    ppdb: db.ppdb.length,
    assignments: db.assignments.length
  });
});


// ----------------------------------------------------
// 2. AUTHENTICATION & PASSWORD MANAGEMENT
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ message: 'Terlalu banyak percobaan login yang gagal. Silakan tunggu 15 menit.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    recordLoginFailure(ip);
    return res.status(400).json({ message: 'Username / NISN / NIP dan password wajib diisi.' });
  }

  const db = await getDb();
  const query = String(username).trim().toLowerCase();
  const user = db.users.find(
    u => u.username.toLowerCase() === query || u.email.toLowerCase() === query
  );

  if (!user) {
    recordLoginFailure(ip);
    return res.status(401).json({ message: 'Akun dengan ID atau email tersebut tidak ditemukan.' });
  }

  const isMatch = verifyPassword(String(password), user.salt, user.passwordHash);
  if (!isMatch) {
    recordLoginFailure(ip);
    return res.status(401).json({ message: 'Kata sandi salah. Mohon periksa kembali.' });
  }

  recordLoginSuccess(ip);
  const token = createToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      linkedId: user.linkedId,
      mustChangePassword: user.mustChangePassword
    }
  });
});

// Legacy backward-compatibility login
app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ message: 'Terlalu banyak percobaan login yang gagal. Silakan tunggu 15 menit.' });
  }

  const { username, password } = req.body || {};
  const db = await getDb();
  const query = String(username || '').trim().toLowerCase();
  const admin = db.users.find(u => u.role === 'admin' && (u.username.toLowerCase() === query || u.email.toLowerCase() === query));

  if (!admin || !verifyPassword(String(password), admin.salt, admin.passwordHash)) {
    recordLoginFailure(ip);
    return res.status(401).json({ message: 'Kredensial admin tidak valid.' });
  }

  recordLoginSuccess(ip);
  res.json({ token: createToken(admin) });
});

app.post('/api/admin/reset-school-data', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const confirmation = String(req.body?.confirmation || '').trim();
  if (confirmation !== 'HAPUS SEMUA DATA SEKOLAH') {
    return res.status(400).json({ message: 'Konfirmasi tidak sesuai. Tidak ada data yang dihapus.' });
  }

  try {
    // Clear legacy disk uploads too, otherwise startup import could restore them to PostgreSQL.
    await fs.rm(UPLOAD_DIR, { recursive: true, force: true });
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const result = await resetSchoolData();
    res.set('Cache-Control', 'no-store');
    return res.json({
      message: 'Data sekolah berhasil direset. Akun admin tetap tersedia.',
      ...result
    });
  } catch (error) {
    console.error('[reset-school-data]', error instanceof Error ? error.message : error);
    return res.status(500).json({ message: 'Reset gagal. Periksa koneksi PostgreSQL dan log server.' });
  }
});

app.get('/api/admin/trash', requireAdmin, async (_req, res) => {
  const { rows } = await pool.query<{ id: string; item_type: string; item_id: string; payload: Record<string, unknown>; deleted_at: Date }>(
    `SELECT id::text, item_type, item_id, payload, deleted_at
     FROM deleted_items ORDER BY deleted_at DESC`
  );
  res.set('Cache-Control', 'no-store').json(rows.map(row => ({
    id: row.id,
    type: row.item_type,
    itemId: row.item_id,
    deletedAt: row.deleted_at,
    label: String(row.payload.fullName || row.payload.title || row.payload.original_name || row.payload.subject || row.payload.id || row.item_id),
    summary: String(row.payload.email || row.payload.nisn || row.payload.nip || row.payload.className || row.payload.mime_type || '')
  })));
});

async function restoreTrashEntry(id: string): Promise<{ status: number; message: string }> {
  try {
    const { rows } = await pool.query<{ id: string; item_type: string; item_id: string; payload: Record<string, any> }>(
      'SELECT id::text, item_type, item_id, payload FROM deleted_items WHERE id = $1', [id]
    );
    const entry = rows[0];
    if (!entry) return { status: 404, message: 'Item tempat sampah tidak ditemukan.' };

    const entriesToRemove = [entry.id];
    if (entry.item_type === 'announcements') {
      const existing = await pool.query('SELECT 1 FROM announcements WHERE id = $1', [entry.item_id]);
      if (existing.rowCount) return { status: 409, message: 'Pengumuman dengan ID yang sama sudah ada; tidak ada data yang diubah.' };
    } else if (entry.item_type !== 'uploaded_files') {
      const allowedCollections = new Set([
        'users', 'students', 'teachers', 'schedules', 'ppdb', 'messages', 'gallery', 'videos',
        'kombelActivities', 'kombelAgendas', 'assignments', 'submissions', 'portalAnnouncements'
      ]);
      if (!allowedCollections.has(entry.item_type)) return { status: 400, message: 'Jenis item ini belum dapat dipulihkan.' };
      const currentDb = await getDb();
      if ((currentDb as any)[entry.item_type].some((item: any) => item.id === entry.item_id)) {
        return { status: 409, message: 'Item dengan ID yang sama sudah ada. Tidak ada data yang diubah.' };
      }
    }

    if (entry.item_type !== 'uploaded_files') {
      const referencedFiles = new Set(
        [...JSON.stringify(entry.payload).matchAll(/\/uploads\/([A-Za-z0-9._-]+)/g)].map(match => match[1])
      );
      for (const filename of referencedFiles) {
        const archivedFile = await pool.query<{ id: string; payload: Record<string, any> }>(
          `SELECT id::text, payload FROM deleted_items WHERE item_type = 'uploaded_files' AND item_id = $1
           ORDER BY deleted_at DESC LIMIT 1`, [filename]
        );
        const fileEntry = archivedFile.rows[0];
        if (fileEntry) {
          const file = fileEntry.payload;
          await pool.query(
            `INSERT INTO uploaded_files (id, original_name, mime_type, size_bytes, content)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
            [file.id, file.original_name, file.mime_type, Number(file.size_bytes), Buffer.from(file.content_base64, 'base64')]
          );
          entriesToRemove.push(fileEntry.id);
        }
      }
    }

    if (entry.item_type === 'uploaded_files') {
      const file = entry.payload;
      await pool.query(
        `INSERT INTO uploaded_files (id, original_name, mime_type, size_bytes, content)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [file.id, file.original_name, file.mime_type, Number(file.size_bytes), Buffer.from(file.content_base64, 'base64')]
      );
    } else if (entry.item_type === 'announcements') {
      const payload = entry.payload;
      await createAnnouncement({
        id: payload.id,
        title: payload.title,
        category: payload.category,
        date: payload.date,
        author: payload.author,
        summary: payload.summary,
        content: payload.content,
        images: Array.isArray(payload.images) ? payload.images : [],
        isImportant: Boolean(payload.isImportant)
      });
    } else {
      const collectionKeys = new Set([
        'users', 'students', 'teachers', 'schedules', 'ppdb', 'messages', 'gallery', 'videos',
        'kombelActivities', 'kombelAgendas', 'assignments', 'submissions', 'portalAnnouncements'
      ]);
      if (!collectionKeys.has(entry.item_type)) return { status: 400, message: 'Jenis item ini belum dapat dipulihkan.' };
      const db = await getDb();
      const collection = (db as any)[entry.item_type];
      if (collection.some((item: any) => item.id === entry.item_id)) {
        return { status: 409, message: 'Item dengan ID yang sama sudah ada. Tidak dipulihkan agar data tidak tertimpa.' };
      }
      collection.push(entry.payload);
      let relatedCondition: string | null = null;
      let relatedValue = '';
      if (entry.item_type === 'students' || entry.item_type === 'teachers') {
        relatedCondition = "item_type = 'users' AND (payload ->> 'linkedId' = $1 OR payload ->> 'username' = $2)";
        relatedValue = String(entry.payload.nisn || entry.payload.nip || '');
      } else if (entry.item_type === 'assignments') {
        relatedCondition = "item_type = 'submissions' AND payload ->> 'assignmentId' = $1";
      }
      if (relatedCondition) {
        const related = await pool.query<{ id: string; item_id: string; payload: Record<string, any> }>(
          `SELECT id::text, item_id, payload FROM deleted_items WHERE ${relatedCondition}`,
          entry.item_type === 'students' || entry.item_type === 'teachers'
            ? [entry.item_id, relatedValue]
            : [entry.item_id]
        );
        const relatedCollection = entry.item_type === 'assignments' ? db.submissions : db.users;
        for (const relatedEntry of related.rows) {
          const isIdUsed = relatedCollection.some((item: any) => item.id === relatedEntry.item_id);
          const isUsernameUsed = entry.item_type !== 'assignments' && db.users.some(user => user.username === relatedEntry.payload.username);
          if (!isIdUsed && !isUsernameUsed) {
            relatedCollection.push(relatedEntry.payload as any);
            entriesToRemove.push(relatedEntry.id);
          }
        }
      }
      await saveDb();
    }

    await pool.query('DELETE FROM deleted_items WHERE id = ANY($1::bigint[])', [entriesToRemove]);
    return { status: 200, message: 'Item berhasil dipulihkan.' };
  } catch (error) {
    console.error('[trash-restore]', error instanceof Error ? error.message : error);
    return { status: 500, message: 'Pemulihan gagal. Periksa apakah data atau ID terkait sudah digunakan.' };
  }
}

app.post('/api/admin/trash/:id/restore', requireAdmin, async (req, res) => {
  const result = await restoreTrashEntry(String(req.params.id));
  res.status(result.status).json({ message: result.message });
});

app.post('/api/admin/trash/restore-selected', requireAdmin, async (req, res) => {
  const requestedIds: unknown[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const ids = [...new Set(requestedIds.filter((id): id is string =>
    typeof id === 'string' && /^[1-9]\d*$/.test(id)
  ))];
  if (!ids.length || ids.length > 500 || ids.length !== requestedIds.length) {
    return res.status(400).json({ message: 'Pilih 1 sampai 500 item Tempat Sampah yang valid untuk dipulihkan.' });
  }

  try {
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id::text FROM deleted_items WHERE id = ANY($1::bigint[]) ORDER BY deleted_at ASC, id ASC',
      [ids]
    );
    for (const entry of rows) {
      await restoreTrashEntry(entry.id);
    }

    const { rows: finalRows } = await pool.query<{ id: string }>(
      'SELECT id::text FROM deleted_items WHERE id = ANY($1::bigint[])',
      [ids]
    );
    const finalIds = new Set(finalRows.map(row => row.id));
    const skippedCount = finalIds.size;
    const restoredCount = ids.length - skippedCount;
    res.json({
      message: skippedCount
        ? `${restoredCount} item berhasil dipulihkan. ${skippedCount} item tidak dipulihkan karena konflik atau jenisnya belum didukung.`
        : `${restoredCount} item berhasil dipulihkan.`,
      restoredCount,
      skippedCount
    });
  } catch (error) {
    console.error('[trash-restore-selected]', error instanceof Error ? error.message : error);
    res.status(500).json({ message: 'Pemulihan item terpilih gagal. Periksa koneksi PostgreSQL dan log server.' });
  }
});

app.delete('/api/admin/trash/bulk', requireAdmin, async (req, res) => {
  const requestedIds: unknown[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const ids = [...new Set(requestedIds.filter((id): id is string =>
    typeof id === 'string' && /^[1-9]\d*$/.test(id)
  ))];
  if (!ids.length || ids.length > 500 || ids.length !== requestedIds.length) {
    return res.status(400).json({ message: 'Pilih 1 sampai 500 item Tempat Sampah yang valid.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: string }>(
      'SELECT id::text FROM deleted_items WHERE id = ANY($1::bigint[]) FOR UPDATE',
      [ids]
    );
    if (rows.length !== ids.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Sebagian item tidak ditemukan. Muat ulang Tempat Sampah dan coba lagi.' });
    }

    await client.query('DELETE FROM deleted_items WHERE id = ANY($1::bigint[])', [ids]);
    await client.query('COMMIT');
    res.json({
      message: `${rows.length} item dihapus permanen dari Tempat Sampah.`,
      removedCount: rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[trash-bulk-delete]', error instanceof Error ? error.message : error);
    res.status(500).json({ message: 'Gagal menghapus item terpilih. Periksa koneksi PostgreSQL dan log server.' });
  } finally {
    client.release();
  }
});

app.delete('/api/admin/trash/:id', requireAdmin, async (req, res) => {
  const result = await pool.query('DELETE FROM deleted_items WHERE id = $1', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ message: 'Item tempat sampah tidak ditemukan.' });
  res.status(204).end();
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const db = await getDb();
  const user = db.users.find(u => u.id === req.user?.sub);
  if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    linkedId: user.linkedId,
    mustChangePassword: user.mustChangePassword
  });
});

app.post('/api/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 12) {
    return res.status(400).json({ message: 'Kata sandi baru harus minimal 12 karakter.' });
  }
  if (oldPassword === newPassword) {
    return res.status(400).json({ message: 'Kata sandi baru tidak boleh sama dengan kata sandi saat ini.' });
  }

  const db = await getDb();
  const userIndex = db.users.findIndex(u => u.id === req.user?.sub);
  if (userIndex < 0) return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });

  const user = db.users[userIndex];
  if (!verifyPassword(String(oldPassword), user.salt, user.passwordHash)) {
    return res.status(400).json({ message: 'Kata sandi lama tidak sesuai.' });
  }

  const newSalt = generateSalt();
  const newHash = hashPassword(String(newPassword), newSalt);
  const updatedUser: UserAccount = {
    ...user,
    salt: newSalt,
    passwordHash: newHash,
    mustChangePassword: false
  };
  db.users[userIndex] = updatedUser;
  db.passwordResets = db.passwordResets.map(item => item.userId === updatedUser.id ? { ...item, used: true } : item);
  await saveDb();

  const freshToken = createToken(updatedUser);
  res.json({
    message: 'Kata sandi berhasil diperbarui.',
    token: freshToken,
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
      linkedId: updatedUser.linkedId,
      mustChangePassword: false
    }
  });
});

// Dual-path password reset: email token or admin assisted
app.post('/api/auth/forgot-password', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (consumePublicActionLimit(`reset:${ip}`, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' });
  }

  const { usernameOrEmail } = req.body || {};
  if (!usernameOrEmail) return res.status(400).json({ message: 'NISN, NIP, atau Email wajib diisi.' });

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const mailUser = process.env.SMTP_USER;
  const mailPass = process.env.SMTP_PASSWORD;
  const fromAddress = process.env.SMTP_FROM_EMAIL || mailUser;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !mailUser || !mailPass || !fromAddress) {
    return res.status(503).json({
      message: 'Pemulihan email belum diaktifkan karena konfigurasi SMTP belum lengkap. Admin perlu mengatur SMTP_HOST, SMTP_USER, SMTP_PASSWORD, dan SMTP_FROM_EMAIL pada .env server lalu memulai ulang backend. Untuk sementara, hubungi Admin Tata Usaha agar sandi direset melalui menu Kelola Akun & Sandi.'
    });
  }

  const db = await getDb();
  const query = String(usernameOrEmail).trim().toLowerCase();
  const user = db.users.find(u => u.username.toLowerCase() === query || String(u.email || '').toLowerCase() === query);

  const genericResponse = {
    message: 'Jika akun memiliki email yang terdaftar, instruksi pemulihan akan dikirim. Jika tidak menerima email, hubungi Admin Tata Usaha.'
  };
  const isSyntheticEmail = user && (
    String(user.email || '').toLowerCase() === `${user.username.toLowerCase()}@siswa.sman1halteng.sch.id` ||
    String(user.email || '').toLowerCase() === `${user.username.toLowerCase()}@sman1halteng.sch.id`
  );
  if (!user || isSyntheticEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) return res.json(genericResponse);

  // Prune expired or used reset requests to maintain high performance
  const now = Date.now();
  db.passwordResets = db.passwordResets.filter(r => !r.used && r.expiresAt > now);

  const token = crypto.randomBytes(32).toString('hex');
  const resetRequest: PasswordResetRequest = {
    id: `rst-${Date.now()}`,
    userId: user.id,
    username: user.username,
    tokenHash: sha256(token),
    expiresAt: now + 30 * 60 * 1000, // 30 minutes
    used: false,
    requestedAt: new Date().toISOString()
  };

  db.passwordResets.unshift(resetRequest);
  await saveDb();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE.toLowerCase() === 'true'
      : port === 465,
    auth: { user: mailUser, pass: mailPass }
  });

  try {
    await transporter.sendMail({
      from: { name: process.env.SMTP_FROM_NAME || 'SMA Negeri 1 Halmahera Tengah', address: fromAddress },
      to: user.email,
      subject: 'Pemulihan Kata Sandi EDUPORTAL',
      text: [
        `Yth. ${user.fullName},`,
        '',
        'Gunakan token berikut pada halaman pemulihan EDUPORTAL. Token berlaku selama 30 menit dan hanya dapat digunakan sekali.',
        '',
        token,
        '',
        'Jika Anda tidak meminta pemulihan kata sandi, abaikan email ini.'
      ].join('\n')
    });
  } catch (error) {
    db.passwordResets = db.passwordResets.filter(item => item.id !== resetRequest.id);
    await saveDb();
    console.error('Gagal mengirim email pemulihan kata sandi:', error);
    return res.status(502).json({
      message: 'Email pemulihan gagal dikirim. Periksa SMTP_USER, SMTP_PASSWORD (gunakan App Password Google, bukan kata sandi utama), dan SMTP_FROM_EMAIL, lalu coba kembali.'
    });
  }

  res.json(genericResponse);
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword || String(newPassword).length < 12) {
    return res.status(400).json({ message: 'Token valid dan kata sandi baru (minimal 12 karakter) wajib diisi.' });
  }

  const db = await getDb();
  const resetIndex = db.passwordResets.findIndex(
    r => matchesSha256(String(token), r.tokenHash) && !r.used && r.expiresAt > Date.now()
  );

  if (resetIndex < 0) {
    return res.status(400).json({ message: 'Token pemulihan tidak valid atau telah kedaluwarsa.' });
  }

  const resetReq = db.passwordResets[resetIndex];
  const userIndex = db.users.findIndex(u => u.id === resetReq.userId);
  if (userIndex < 0) return res.status(404).json({ message: 'Akun tidak ditemukan.' });

  const newSalt = generateSalt();
  const newHash = hashPassword(String(newPassword), newSalt);

  db.users[userIndex].salt = newSalt;
  db.users[userIndex].passwordHash = newHash;
  db.users[userIndex].mustChangePassword = false;
  db.passwordResets = db.passwordResets.map(item =>
    item.userId === resetReq.userId ? { ...item, used: true } : item
  );
  await saveDb();

  res.json({ message: 'Kata sandi berhasil direset. Silakan masuk menggunakan kata sandi baru Anda.' });
});

// Admin-assisted reset password
app.post('/api/auth/admin-reset-password', requireAdmin, async (req, res) => {
  const { userId, tempPassword } = req.body || {};
  if (!userId || !tempPassword || String(tempPassword).length < 12) {
    return res.status(400).json({ message: 'User ID dan kata sandi sementara minimal 12 karakter wajib diisi.' });
  }

  const db = await getDb();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex < 0) return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });

  const newSalt = generateSalt();
  const newHash = hashPassword(String(tempPassword), newSalt);
  db.users[userIndex].salt = newSalt;
  db.users[userIndex].passwordHash = newHash;
  db.users[userIndex].mustChangePassword = true;
  db.passwordResets = db.passwordResets.map(item => item.userId === userId ? { ...item, used: true } : item);
  await saveDb();

  res.json({ message: `Kata sandi untuk ${db.users[userIndex].fullName} berhasil direset sementara.` });
});

// User accounts list for Admin
app.get('/api/users', requireAdmin, async (_req, res) => {
  const db = await getDb();
  const cleanUsers = db.users.map(({ passwordHash, salt, ...rest }) => rest);
  res.set('Cache-Control', 'no-store').json(cleanUsers);
});

app.post('/api/users', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const body = req.body || {};
  const username = String(body.username || '').trim();
  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim();
  const role = String(body.role || '') as UserRole;
  const validRoles: UserRole[] = ['siswa', 'guru', 'admin', 'kepala_sekolah', 'ketua_kombel'];
  if (!username || username.length > 100 || !fullName || fullName.length > 160 || !validRoles.includes(role)) {
    return res.status(400).json({ message: 'Username, nama lengkap, dan peran yang valid wajib diisi.' });
  }
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return res.status(400).json({ message: 'Format email tidak valid.' });
  }

  const db = await getDb();
  if (db.users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ message: 'Username sudah digunakan.' });
  }

  let linkedId: string | undefined;
  let accountName = fullName;
  let accountEmail = email;
  let avatarUrl: string | undefined;
  if (role === 'siswa') {
    const student = db.students.find(item => item.nisn.toLowerCase() === username.toLowerCase());
    if (!student) return res.status(400).json({ message: 'Akun siswa harus dibuat dari data siswa, atau username harus sama dengan NISN siswa yang sudah terdaftar.' });
    linkedId = student.id;
    accountName = student.fullName;
    accountEmail = student.email || email;
  } else if (['guru', 'kepala_sekolah', 'ketua_kombel'].includes(role)) {
    const teacher = db.teachers.find(item => item.nip.toLowerCase() === username.toLowerCase());
    if (role === 'guru' && !teacher) return res.status(400).json({ message: 'Akun guru harus dibuat dari data guru, atau username harus sama dengan NIP guru yang sudah terdaftar.' });
    if (teacher) {
      linkedId = teacher.id;
      accountName = teacher.fullName;
      accountEmail = teacher.email || email;
      avatarUrl = teacher.photoUrl;
    }
  }

  const temporaryPassword = crypto.randomBytes(18).toString('base64url');
  const salt = generateSalt();
  const user: UserAccount = {
    id: `usr-${crypto.randomUUID()}`,
    username,
    passwordHash: hashPassword(temporaryPassword, salt),
    salt,
    role,
    fullName: accountName,
    email: accountEmail,
    linkedId,
    avatarUrl,
    mustChangePassword: true
  };
  db.users.push(user);
  await saveDb();
  const { passwordHash: _passwordHash, salt: _salt, ...safeUser } = user;
  res.status(201).set('Cache-Control', 'no-store').json({
    user: safeUser,
    temporaryPassword,
    message: 'Akun berhasil dibuat. Pengguna wajib mengganti kata sandi saat masuk pertama kali.'
  });
});

app.put('/api/users/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const body = req.body || {};
  const username = String(body.username || '').trim();
  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim();
  const role = String(body.role || '') as UserRole;
  const validRoles: UserRole[] = ['siswa', 'guru', 'admin', 'kepala_sekolah', 'ketua_kombel'];
  if (!username || username.length > 100 || !fullName || fullName.length > 160 || !validRoles.includes(role)) {
    return res.status(400).json({ message: 'Username, nama lengkap, dan peran yang valid wajib diisi.' });
  }
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return res.status(400).json({ message: 'Format email tidak valid.' });
  }

  const db = await getDb();
  const user = db.users.find(item => item.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Akun tidak ditemukan.' });
  if (db.users.some(item => item.id !== user.id && item.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ message: 'Username sudah digunakan akun lain.' });
  }
  if (user.id === req.user?.sub && role !== user.role) {
    return res.status(400).json({ message: 'Peran akun admin yang sedang digunakan tidak dapat diubah dari sesi ini.' });
  }

  const linkedStudent = db.students.find(item => item.id === user.linkedId);
  const linkedTeacher = db.teachers.find(item => item.id === user.linkedId);
  if (linkedStudent && role !== 'siswa') return res.status(400).json({ message: 'Peran akun siswa tertaut tidak dapat diubah. Ubah data profil siswa secara terpisah.' });
  if (linkedTeacher && !['guru', 'kepala_sekolah', 'ketua_kombel'].includes(role)) {
    return res.status(400).json({ message: 'Peran akun guru tertaut harus tetap sebagai guru, kepala sekolah, atau ketua KOMBEL.' });
  }
  if (linkedStudent && db.students.some(item => item.id !== linkedStudent.id && item.nisn.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ message: 'NISN tersebut sudah dipakai profil siswa lain.' });
  }
  if (linkedTeacher && db.teachers.some(item => item.id !== linkedTeacher.id && item.nip.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ message: 'NIP tersebut sudah dipakai profil guru lain.' });
  }

  user.username = username;
  user.fullName = fullName;
  user.email = email;
  user.role = role;
  if (linkedStudent) {
    linkedStudent.nisn = username;
    linkedStudent.fullName = fullName;
    linkedStudent.email = email;
  }
  if (linkedTeacher) {
    linkedTeacher.nip = username;
    linkedTeacher.fullName = fullName;
    linkedTeacher.email = email;
  }
  await saveDb();
  const { passwordHash: _passwordHash, salt: _salt, ...safeUser } = user;
  res.set('Cache-Control', 'no-store').json({ user: safeUser, message: 'Data akun berhasil diperbarui.' });
});

app.delete('/api/users', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? [...new Set(req.body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))]
    : [];
  if (!ids.length) return res.status(400).json({ message: 'Pilih setidaknya satu akun untuk dihapus.' });

  const db = await getDb();
  const selected = db.users.filter(user => ids.includes(user.id));
  if (!selected.length) return res.status(404).json({ message: 'Akun yang dipilih tidak ditemukan.' });
  if (selected.some(user => user.id === req.user?.sub)) {
    return res.status(400).json({ message: 'Akun admin yang sedang digunakan tidak dapat dihapus.' });
  }
  const removedAdmins = selected.filter(user => user.role === 'admin').length;
  const totalAdmins = db.users.filter(user => user.role === 'admin').length;
  if (totalAdmins - removedAdmins < 1) {
    return res.status(400).json({ message: 'Minimal satu akun admin harus tetap tersedia.' });
  }

  const selectedIds = new Set(selected.map(user => user.id));
  db.users = db.users.filter(user => !selectedIds.has(user.id));
  await saveDb();
  res.json({
    message: `${selected.length} akun dipindahkan ke Tempat Sampah dan dapat dipulihkan.`,
    removedCount: selected.length
  });
});

app.post('/api/admin/bulk-delete', requireAdmin, async (req, res) => {
  const allowedCollections = new Set([
    'students', 'teachers', 'ppdb', 'gallery', 'videos', 'kombelActivities',
    'kombelAgendas', 'messages', 'assignments', 'submissions', 'portalAnnouncements'
  ]);
  const collection = req.body?.collection;
  const ids = Array.isArray(req.body?.ids)
    ? [...new Set(req.body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0))]
    : [];
  if (typeof collection !== 'string' || !allowedCollections.has(collection)) {
    return res.status(400).json({ message: 'Jenis data yang dipilih tidak didukung untuk hapus massal.' });
  }
  if (!ids.length || ids.length > 500) {
    return res.status(400).json({ message: 'Pilih 1 sampai 500 data untuk dihapus.' });
  }

  const db = await getDb();
  const selectedIds = new Set(ids);
  const filesToDelete: string[] = [];
  let removedCount = 0;

  switch (collection) {
    case 'students': {
      const selected = db.students.filter(item => selectedIds.has(item.id));
      if (selected.length !== ids.length) return res.status(404).json({ message: 'Sebagian data siswa tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      const usernames = new Set(selected.map(item => item.nisn));
      const linkedIds = new Set(selected.map(item => item.id));
      db.students = db.students.filter(item => !selectedIds.has(item.id));
      db.users = db.users.filter(user => !linkedIds.has(user.linkedId || '') && !usernames.has(user.username));
      removedCount = selected.length;
      break;
    }
    case 'teachers': {
      const selected = db.teachers.filter(item => selectedIds.has(item.id));
      if (selected.length !== ids.length) return res.status(404).json({ message: 'Sebagian data guru/staf tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      const nips = new Set(selected.map(item => item.nip));
      const linkedIds = new Set(selected.map(item => item.id));
      db.teachers = db.teachers.filter(item => !selectedIds.has(item.id));
      db.users = db.users.filter(user => !linkedIds.has(user.linkedId || '') && !nips.has(user.username));
      filesToDelete.push(...selected.map(item => item.photoUrl));
      removedCount = selected.length;
      break;
    }
    case 'ppdb': {
      if (!db.ppdb.some(item => selectedIds.has(item.id)) || db.ppdb.filter(item => selectedIds.has(item.id)).length !== ids.length) {
        return res.status(404).json({ message: 'Sebagian data PPDB tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      }
      db.ppdb = db.ppdb.filter(item => !selectedIds.has(item.id));
      removedCount = ids.length;
      break;
    }
    case 'gallery': {
      const selected = db.gallery.filter(item => selectedIds.has(item.id));
      if (selected.length !== ids.length) return res.status(404).json({ message: 'Sebagian album galeri tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      db.gallery = db.gallery.filter(item => !selectedIds.has(item.id));
      for (const item of selected) filesToDelete.push(item.image, ...(item.additionalImages || []));
      removedCount = selected.length;
      break;
    }
    case 'videos': {
      const count = db.videos.filter(item => selectedIds.has(item.id)).length;
      if (count !== ids.length) return res.status(404).json({ message: 'Sebagian video tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      db.videos = db.videos.filter(item => !selectedIds.has(item.id));
      removedCount = count;
      break;
    }
    case 'kombelActivities': {
      const selected = db.kombelActivities.filter(item => selectedIds.has(item.id));
      if (selected.length !== ids.length) return res.status(404).json({ message: 'Sebagian kegiatan KOMBEL tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      db.kombelActivities = db.kombelActivities.filter(item => !selectedIds.has(item.id));
      for (const item of selected) filesToDelete.push(item.image, ...(item.additionalImages || []));
      removedCount = selected.length;
      break;
    }
    case 'kombelAgendas': {
      const count = db.kombelAgendas.filter(item => selectedIds.has(item.id)).length;
      if (count !== ids.length) return res.status(404).json({ message: 'Sebagian agenda KOMBEL tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      db.kombelAgendas = db.kombelAgendas.filter(item => !selectedIds.has(item.id));
      removedCount = count;
      break;
    }
    case 'messages': {
      const count = db.messages.filter(item => selectedIds.has(item.id)).length;
      if (count !== ids.length) return res.status(404).json({ message: 'Sebagian pesan tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      db.messages = db.messages.filter(item => !selectedIds.has(item.id));
      removedCount = count;
      break;
    }
    case 'assignments': {
      const count = db.assignments.filter(item => selectedIds.has(item.id)).length;
      if (count !== ids.length) return res.status(404).json({ message: 'Sebagian tugas tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      const selectedSubmissions = db.submissions.filter(item => selectedIds.has(item.assignmentId));
      filesToDelete.push(...selectedSubmissions
        .filter(item => item.submissionType === 'file')
        .map(item => item.linkOrContent));
      db.assignments = db.assignments.filter(item => !selectedIds.has(item.id));
      db.submissions = db.submissions.filter(item => !selectedIds.has(item.assignmentId));
      removedCount = count;
      break;
    }
    case 'submissions': {
      const selected = db.submissions.filter(item => selectedIds.has(item.id));
      if (selected.length !== ids.length) return res.status(404).json({ message: 'Sebagian pengumpulan tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      filesToDelete.push(...selected
        .filter(item => item.submissionType === 'file')
        .map(item => item.linkOrContent));
      db.submissions = db.submissions.filter(item => !selectedIds.has(item.id));
      removedCount = selected.length;
      break;
    }
    case 'portalAnnouncements': {
      const count = db.portalAnnouncements.filter(item => selectedIds.has(item.id)).length;
      if (count !== ids.length) return res.status(404).json({ message: 'Sebagian pengumuman internal tidak ditemukan. Muat ulang daftar dan coba lagi.' });
      db.portalAnnouncements = db.portalAnnouncements.filter(item => !selectedIds.has(item.id));
      removedCount = count;
      break;
    }
  }

  await saveDb();
  for (const file of filesToDelete) await safeDeleteImage(file);
  res.json({
    message: `${removedCount} data dipindahkan ke Tempat Sampah dan dapat dipulihkan.`,
    removedCount
  });
});

// Provision portal accounts for legacy student/teacher records that predate automatic account creation.
app.post('/api/users/provision-linked-accounts', requireAdmin, async (_req, res) => {
  const db = await getDb();
  const created: { fullName: string; role: 'siswa' | 'guru'; username: string; temporaryPassword: string }[] = [];
  const conflicts: { fullName: string; role: 'siswa' | 'guru'; username: string }[] = [];
  let updatedLinks = false;

  const provision = (person: Student | Teacher, role: 'siswa' | 'guru', username: string, email: string, avatarUrl?: string) => {
    const linked = db.users.find(user => user.linkedId === person.id);
    const sameUsername = db.users.find(user => user.username.toLowerCase() === username.toLowerCase());
    const isCompatible = (account: UserAccount) => role === 'siswa'
      ? account.role === 'siswa'
      : ['guru', 'kepala_sekolah', 'ketua_kombel'].includes(account.role);

    if (linked) {
      if (isCompatible(linked)) return;
      conflicts.push({ fullName: person.fullName, role, username });
      return;
    }
    if (sameUsername) {
      if (isCompatible(sameUsername) && !sameUsername.linkedId) {
        sameUsername.linkedId = person.id;
        sameUsername.fullName = person.fullName;
        sameUsername.email = email;
        if (avatarUrl) sameUsername.avatarUrl = avatarUrl;
        updatedLinks = true;
        return;
      }
      conflicts.push({ fullName: person.fullName, role, username });
      return;
    }

    const temporaryPassword = crypto.randomBytes(18).toString('base64url');
    const salt = generateSalt();
    let accountId = `usr-${person.id}`;
    if (db.users.some(user => user.id === accountId)) accountId = `usr-${crypto.randomUUID()}`;
    db.users.push({
      id: accountId,
      username,
      passwordHash: hashPassword(temporaryPassword, salt),
      salt,
      role,
      fullName: person.fullName,
      email,
      linkedId: person.id,
      avatarUrl,
      mustChangePassword: true
    });
    created.push({ fullName: person.fullName, role, username, temporaryPassword });
  };

  for (const student of db.students) {
    provision(student, 'siswa', student.nisn, student.email || '', undefined);
  }
  for (const teacher of db.teachers) {
    provision(teacher, 'guru', teacher.nip, teacher.email || '', teacher.photoUrl);
  }

  if (created.length || updatedLinks) await saveDb();
  res.set('Cache-Control', 'no-store');
  res.json({
    created,
    conflicts,
    profiles: { siswa: db.students.length, guru: db.teachers.length },
    accounts: {
      siswa: db.students.filter(student => db.users.some(user => user.role === 'siswa' && (user.linkedId === student.id || user.username === student.nisn))).length,
      guru: db.teachers.filter(teacher => db.users.some(user => ['guru', 'kepala_sekolah', 'ketua_kombel'].includes(user.role) && (user.linkedId === teacher.id || user.username === teacher.nip))).length
    }
  });
});

// ----------------------------------------------------
// 3. ANNOUNCEMENTS (WARTA & PENGUMUMAN SEKOLAH)
// ----------------------------------------------------
registerAnnouncementRoutes(app, { persistImage, safeDeleteImage });

// ----------------------------------------------------
// 4. GALLERY FOTO (6 KATEGORI & MULTI-FOTO)
// ----------------------------------------------------
app.get('/api/gallery', async (_req, res) => {
  const db = await getDb();
  const data = [...db.gallery].sort((a, b) =>
    new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );
  res.json(data);
});

app.post('/api/gallery', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.title || !body.category || !body.image) {
      return res.status(400).json({ message: 'Judul, kategori, dan foto utama wajib diisi.' });
    }
    let image = body.image;
    if (image.startsWith('data:image/')) image = await persistImage(image, 'gallery');

    // Handle additional images if provided
    let additionalImages: string[] = [];
    if (Array.isArray(body.additionalImages)) {
      for (const img of body.additionalImages) {
        if (img.startsWith('data:image/')) {
          additionalImages.push(await persistImage(img, 'gallery-sub'));
        } else if (typeof img === 'string') {
          additionalImages.push(img);
        }
      }
    }

    const item: GalleryPhoto = {
      id: `gal-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      title: String(body.title).trim(),
      category: body.category,
      date: body.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      image,
      additionalImages: additionalImages.length ? additionalImages : undefined,
      description: String(body.description || '').trim(),
      photographer: String(body.photographer || 'Admin Sekolah').trim(),
      createdAt: new Date().toISOString()
    };

    const db = await getDb();
    db.gallery.unshift(item);
    await saveDb();
    res.status(201).json(item);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Gagal menyimpan foto.' });
  }
});

app.put('/api/gallery/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const index = db.gallery.findIndex(x => x.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: 'Foto tidak ditemukan.' });

    const old = db.gallery[index];
    let image = req.body?.image ?? old.image;
    if (image?.startsWith('data:image/')) image = await persistImage(image, 'gallery');

    const additionalImages = Array.isArray(req.body?.additionalImages)
      ? (await Promise.all(req.body.additionalImages.map(async (img: unknown) => {
          if (typeof img !== 'string') return null;
          return img.startsWith('data:image/') ? persistImage(img, 'gallery-sub') : img;
        }))).filter((img): img is string => img !== null)
      : old.additionalImages;

    db.gallery[index] = { ...old, ...req.body, id: old.id, image, additionalImages };
    await saveDb();
    if (image !== old.image) await safeDeleteImage(old.image);
    res.json(db.gallery[index]);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Gagal memperbarui foto galeri.' });
  }
});

app.delete('/api/gallery/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const item = db.gallery.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Foto tidak ditemukan.' });

  db.gallery = db.gallery.filter(x => x.id !== req.params.id);
  await safeDeleteImage(item.image);
  if (Array.isArray(item.additionalImages)) {
    for (const subImg of item.additionalImages) {
      await safeDeleteImage(subImg);
    }
  }
  await saveDb();
  res.status(204).end();
});

app.get('/api/home-hero', async (_req, res) => {
  const db = await getDb();
  res.json(db.homeHeroSlides);
});

app.put('/api/home-hero', requireAdmin, async (req, res) => {
  try {
    const images = req.body?.images;
    if (!Array.isArray(images) || images.length < 1 || images.length > 7 || images.some(image => typeof image !== 'string')) {
      return res.status(400).json({ message: 'Carousel beranda harus berisi 1 sampai 7 foto.' });
    }

    const db = await getDb();
    const previousImages = db.homeHeroSlides || [];
    const savedImages: string[] = [];
    for (const image of images) {
      if (image.startsWith('data:image/')) {
        savedImages.push(await persistImage(image, 'home-hero'));
      } else if (image.startsWith('/uploads/')) {
        savedImages.push(image);
      } else {
        return res.status(400).json({ message: 'Foto carousel tidak valid.' });
      }
    }

    db.homeHeroSlides = savedImages;
    await saveDb();
    for (const oldImage of previousImages) {
      if (!savedImages.includes(oldImage)) await safeDeleteImage(oldImage);
    }
    res.json(savedImages);
  } catch (error: any) {
    res.status(400).json({ message: error?.message || 'Gagal menyimpan foto carousel beranda.' });
  }
});

// ----------------------------------------------------
// 5. YOUTUBE VIDEO GALLERY
// ----------------------------------------------------
app.get('/api/videos', async (_req, res) => {
  const db = await getDb();
  const data = [...db.videos].sort((a, b) =>
    new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );
  res.json(data);
});

app.post('/api/videos', requireAdmin, async (req, res) => {
  try {
    const { title, category, youtubeUrl, description, date } = req.body || {};
    if (!title || !youtubeUrl) {
      return res.status(400).json({ message: 'Judul dan URL YouTube wajib diisi.' });
    }

    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ message: 'URL YouTube tidak valid. Gunakan format youtube.com atau youtu.be.' });
    }

    const item: YouTubeVideo = {
      id: `vid-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      title: String(title).trim(),
      category: category || 'Kegiatan',
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      description: String(description || '').trim(),
      date: date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      createdAt: new Date().toISOString()
    };

    const db = await getDb();
    db.videos.unshift(item);
    await saveDb();
    res.status(201).json(item);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Gagal menambahkan video YouTube.' });
  }
});

app.put('/api/videos/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const index = db.videos.findIndex(v => v.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: 'Video tidak ditemukan.' });

    const old = db.videos[index];
    let videoId = old.videoId;
    let thumbnailUrl = old.thumbnailUrl;
    let youtubeUrl = old.youtubeUrl;

    if (req.body?.youtubeUrl && req.body.youtubeUrl !== old.youtubeUrl) {
      const extracted = extractYouTubeVideoId(req.body.youtubeUrl);
      if (!extracted) return res.status(400).json({ message: 'URL YouTube baru tidak valid.' });
      videoId = extracted;
      thumbnailUrl = `https://img.youtube.com/vi/${extracted}/hqdefault.jpg`;
      youtubeUrl = `https://www.youtube.com/watch?v=${extracted}`;
    }

    db.videos[index] = {
      ...old,
      ...req.body,
      id: old.id,
      videoId,
      thumbnailUrl,
      youtubeUrl
    };
    await saveDb();
    res.json(db.videos[index]);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Gagal memperbarui video.' });
  }
});

app.delete('/api/videos/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const exists = db.videos.some(v => v.id === req.params.id);
  if (!exists) return res.status(404).json({ message: 'Video tidak ditemukan.' });

  db.videos = db.videos.filter(v => v.id !== req.params.id);
  await saveDb();
  res.status(204).end();
});

// ----------------------------------------------------
// 6. KOMBEL (KOMUNITAS BELAJAR GURU)
// ----------------------------------------------------
app.get('/api/kombel/activities', async (_req, res) => {
  const db = await getDb();
  const data = [...db.kombelActivities].sort((a, b) =>
    new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );
  res.json(data);
});

app.post('/api/kombel/activities', requireAdminOrKombel, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.title || !body.description) {
      return res.status(400).json({ message: 'Judul dan deskripsi kegiatan KOMBEL wajib diisi.' });
    }
    let image = body.image || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800';
    if (image.startsWith('data:image/')) image = await persistImage(image, 'kombel');
    const additionalImages = Array.isArray(body.additionalImages)
      ? await Promise.all(body.additionalImages.map(async (img: unknown) => {
          if (typeof img !== 'string') return null;
          return img.startsWith('data:image/') ? persistImage(img, 'kombel') : img;
        })).then(images => images.filter((img): img is string => img !== null))
      : [];

    const item: KombelActivity = {
      id: `kbl-act-${Date.now()}`,
      title: String(body.title).trim(),
      date: body.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      image,
      additionalImages: additionalImages.length ? additionalImages : undefined,
      description: String(body.description).trim(),
      speaker: body.speaker ? String(body.speaker).trim() : undefined,
      attendeesCount: body.attendeesCount ? Number(body.attendeesCount) : undefined,
      createdAt: new Date().toISOString()
    };

    const db = await getDb();
    db.kombelActivities.unshift(item);
    await saveDb();
    res.status(201).json(item);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Gagal menyimpan kegiatan KOMBEL.' });
  }
});

app.put('/api/kombel/activities/:id', requireAdminOrKombel, async (req, res) => {
  const persistedImages: string[] = [];
  try {
    const db = await getDb();
    const index = db.kombelActivities.findIndex(a => a.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: 'Kegiatan KOMBEL tidak ditemukan.' });

    const old = db.kombelActivities[index];
    let image = req.body?.image ?? old.image;
    if (image?.startsWith('data:image/')) {
      image = await persistImage(image, 'kombel');
      persistedImages.push(image);
    }
    const additionalImages = Array.isArray(req.body?.additionalImages)
      ? (await Promise.all(req.body.additionalImages.map(async (img: unknown) => {
          if (typeof img !== 'string') return null;
          if (img.startsWith('data:image/')) {
            const savedImage = await persistImage(img, 'kombel');
            persistedImages.push(savedImage);
            return savedImage;
          }
          return img;
        }))).filter((img): img is string => img !== null)
      : old.additionalImages;

    db.kombelActivities[index] = { ...old, ...req.body, id: old.id, image, additionalImages };
    await saveDb();
    const retainedImages = new Set([image, ...(additionalImages || [])]);
    const oldImages = new Set([old.image, ...(old.additionalImages || [])]);
    for (const oldImage of oldImages) {
      if (oldImage && !retainedImages.has(oldImage)) await safeDeleteImage(oldImage);
    }
    res.json(db.kombelActivities[index]);
  } catch (e: any) {
    for (const image of persistedImages) await safeDeleteImage(image);
    res.status(400).json({ message: e.message || 'Gagal memperbarui kegiatan KOMBEL.' });
  }
});

app.delete('/api/kombel/activities/:id', requireAdminOrKombel, async (req, res) => {
  const db = await getDb();
  const item = db.kombelActivities.find(a => a.id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Kegiatan KOMBEL tidak ditemukan.' });

  db.kombelActivities = db.kombelActivities.filter(a => a.id !== req.params.id);
  await safeDeleteImage(item.image);
  if (Array.isArray(item.additionalImages)) {
    for (const image of item.additionalImages) await safeDeleteImage(image);
  }
  await saveDb();
  res.status(204).end();
});

// KOMBEL Agendas
app.get('/api/kombel/info', async (_req, res) => {
  const db = await getDb();
  res.json(db.kombelInfo);
});

app.put('/api/kombel/info', requireAdminOrKombel, async (req, res) => {
  const fields: (keyof KombelInfo)[] = [
    'routineTitle', 'routineDescription',
    'venueTitle', 'venueDescription',
    'purposeTitle', 'purposeDescription'
  ];
  const info = {} as KombelInfo;

  for (const field of fields) {
    const value = req.body?.[field];
    const maxLength = field.endsWith('Title') ? 120 : 1000;
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
      return res.status(400).json({
        message: `Kolom ${field} wajib diisi dan maksimal ${maxLength} karakter.`
      });
    }
    info[field] = value.trim();
  }

  const db = await getDb();
  db.kombelInfo = info;
  await saveDb();
  res.json(db.kombelInfo);
});

app.get('/api/kombel/agendas', async (_req, res) => {
  const db = await getDb();
  res.json(db.kombelAgendas);
});

app.post('/api/kombel/agendas', requireAdminOrKombel, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.title || !body.date) {
      return res.status(400).json({ message: 'Judul dan tanggal agenda wajib diisi.' });
    }

    const item: KombelAgenda = {
      id: `kbl-agd-${Date.now()}`,
      title: String(body.title).trim(),
      date: String(body.date).trim(),
      time: body.time ? String(body.time).trim() : '09.00 - 12.00 WIT',
      location: body.location ? String(body.location).trim() : 'Ruang Guru SMAN 1 Halmahera Tengah',
      description: String(body.description || '').trim(),
      moderator: body.moderator ? String(body.moderator).trim() : undefined,
      createdAt: new Date().toISOString()
    };

    const db = await getDb();
    db.kombelAgendas.unshift(item);
    await saveDb();
    res.status(201).json(item);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Gagal menyimpan agenda KOMBEL.' });
  }
});

app.put('/api/kombel/agendas/:id', requireAdminOrKombel, async (req, res) => {
  const db = await getDb();
  const index = db.kombelAgendas.findIndex(a => a.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: 'Agenda tidak ditemukan.' });

  db.kombelAgendas[index] = { ...db.kombelAgendas[index], ...req.body, id: db.kombelAgendas[index].id };
  await saveDb();
  res.json(db.kombelAgendas[index]);
});

app.delete('/api/kombel/agendas/:id', requireAdminOrKombel, async (req, res) => {
  const db = await getDb();
  db.kombelAgendas = db.kombelAgendas.filter(a => a.id !== req.params.id);
  await saveDb();
  res.status(204).end();
});

// ----------------------------------------------------
// 7. TEACHERS (GURU) CRUD
// ----------------------------------------------------
app.get('/api/teachers', async (_req, res) => {
  const db = await getDb();
  res.json(db.teachers);
});

app.post('/api/admin/roster/import', requireAdmin, async (req, res) => {
  const studentRows = req.body?.students;
  const teacherRows = req.body?.teachers;
  if (!Array.isArray(studentRows) || !Array.isArray(teacherRows) || studentRows.length + teacherRows.length === 0) {
    return res.status(400).json({ message: 'Data siswa dan guru/staf dari Excel tidak valid atau kosong.' });
  }
  if (studentRows.length > 10000 || teacherRows.length > 10000 || studentRows.length + teacherRows.length > 10000) {
    return res.status(400).json({ message: 'Impor maksimal 10.000 baris dalam satu file.' });
  }

  const db = await getDb();
  const nextStudents = db.students.map(item => ({ ...item }));
  const nextTeachers = db.teachers.map(item => ({ ...item, classesTaught: [...(item.classesTaught || [])] }));
  const errors: string[] = [];
  const studentSeen = new Set<string>();
  const teacherSeen = new Set<string>();
  const studentCounts = { created: 0, updated: 0 };
  const teacherCounts = { created: 0, updated: 0 };
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const departments = ['MIPA', 'Bahasa', 'IPS', 'Seni & Olahraga', 'BK', 'Informatika'];

  for (const [index, raw] of studentRows.entries()) {
    const row = raw && typeof raw === 'object' ? raw : {};
    const sourceRow = Number.isInteger(row.sourceRow) ? row.sourceRow : index + 2;
    const nisn = String(row.nisn || '').trim();
    const fullName = String(row.fullName || '').trim();
    const email = String(row.email || '').trim();
    const genderInput = String(row.gender || '').trim().toLowerCase();
    const gender = ['l', 'lk', 'laki-laki', 'laki laki', 'male'].includes(genderInput)
      ? 'Laki-laki'
      : ['p', 'pr', 'perempuan', 'female'].includes(genderInput)
        ? 'Perempuan'
        : null;
    const classId = normalizeSchoolClassId(String(row.classId || '').trim());
    if (!nisn || !fullName || !emailPattern.test(email) || !gender || !isSchoolClass(classId)) {
      errors.push(`Sheet Siswa baris ${sourceRow}: NISN, nama, email valid, jenis kelamin, atau kelas tidak valid.`);
      continue;
    }
    if (studentSeen.has(nisn)) {
      errors.push(`Sheet Siswa baris ${sourceRow}: NISN ${nisn} muncul lebih dari sekali di file.`);
      continue;
    }
    studentSeen.add(nisn);
    const existing = nextStudents.find(item => item.nisn === nisn);
    const linkedUser = db.users.find(user => user.username === nisn || (existing && user.linkedId === existing.id));
    if (linkedUser && linkedUser.role !== 'siswa') {
      errors.push(`Sheet Siswa baris ${sourceRow}: NISN ${nisn} sudah digunakan akun dengan peran lain.`);
      continue;
    }
    if (linkedUser && existing && linkedUser.linkedId && linkedUser.linkedId !== existing.id) {
      errors.push(`Sheet Siswa baris ${sourceRow}: NISN ${nisn} sudah digunakan akun lain.`);
      continue;
    }
    if (linkedUser && !existing) {
      errors.push(`Sheet Siswa baris ${sourceRow}: NISN ${nisn} sudah digunakan akun tanpa profil siswa.`);
      continue;
    }

    const item: Student = {
      id: existing?.id || `std-${crypto.randomUUID()}`,
      nisn,
      nis: String(row.nis || '').trim() || existing?.nis || nisn.slice(-5),
      fullName,
      email,
      gender,
      classId,
      className: classId,
      academicYear: String(row.academicYear || '').trim() || existing?.academicYear || '2026/2027',
      homeroomTeacher: String(row.homeroomTeacher || '').trim() || existing?.homeroomTeacher || '-'
    };
    if (existing) {
      nextStudents[nextStudents.indexOf(existing)] = item;
      studentCounts.updated += 1;
    } else {
      nextStudents.push(item);
      studentCounts.created += 1;
    }
  }

  for (const [index, raw] of teacherRows.entries()) {
    const row = raw && typeof raw === 'object' ? raw : {};
    const sourceRow = Number.isInteger(row.sourceRow) ? row.sourceRow : index + 2;
    const nip = String(row.nip || '').replace(/\s+/g, '');
    const fullName = String(row.fullName || '').trim();
    const subject = String(row.subject || '').trim();
    const email = String(row.email || '').trim();
    const department = String(row.department || '').trim();
    const classesRaw: unknown[] = Array.isArray(row.classesTaught) ? row.classesTaught : [];
    const classesTaught: string[] = classesRaw.map((value: unknown): string =>
      normalizeSchoolClassId(String(value || '').trim())
    );
    const homeroomInput = String(row.homeroomClass || '').trim();
    const homeroomClass = homeroomInput ? normalizeSchoolClassId(homeroomInput) : '';
    if (
      !nip || !fullName || !subject || !emailPattern.test(email) ||
      !departments.includes(department) ||
      classesTaught.some((classId: string) => !isSchoolClass(classId)) ||
      (homeroomClass && !isSchoolClass(homeroomClass))
    ) {
      errors.push(`Sheet Guru & Staff baris ${sourceRow}: NIP, nama, mata pelajaran/jabatan, email, departemen, atau kelas tidak valid.`);
      continue;
    }
    if (teacherSeen.has(nip)) {
      errors.push(`Sheet Guru & Staff baris ${sourceRow}: NIP ${nip} muncul lebih dari sekali di file.`);
      continue;
    }
    teacherSeen.add(nip);
    const existing = nextTeachers.find(item => item.nip === nip);
    const linkedUser = db.users.find(user => user.username === nip || (existing && user.linkedId === existing.id));
    if (linkedUser && !['guru', 'kepala_sekolah', 'ketua_kombel'].includes(linkedUser.role)) {
      errors.push(`Sheet Guru & Staff baris ${sourceRow}: NIP ${nip} sudah digunakan akun dengan peran lain.`);
      continue;
    }
    if (linkedUser && existing && linkedUser.linkedId && linkedUser.linkedId !== existing.id) {
      errors.push(`Sheet Guru & Staff baris ${sourceRow}: NIP ${nip} sudah digunakan akun lain.`);
      continue;
    }
    if (linkedUser && !existing) {
      errors.push(`Sheet Guru & Staff baris ${sourceRow}: NIP ${nip} sudah digunakan akun tanpa profil guru/staf.`);
      continue;
    }

    const item: Teacher = {
      id: existing?.id || `tch-${crypto.randomUUID()}`,
      nip,
      fullName,
      degree: String(row.degree || '').trim() || existing?.degree || '',
      subject,
      department: department as Teacher['department'],
      classesTaught: [...new Set(classesTaught.length ? classesTaught : existing?.classesTaught || [])],
      homeroomClass: homeroomClass || existing?.homeroomClass || '',
      education: String(row.education || '').trim() || existing?.education || '',
      email,
      phone: String(row.phone || '').trim() || existing?.phone || '-',
      photoUrl: existing?.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
      bio: String(row.bio || '').trim() || existing?.bio || ''
    };
    if (existing) {
      nextTeachers[nextTeachers.indexOf(existing)] = item;
      teacherCounts.updated += 1;
    } else {
      nextTeachers.push(item);
      teacherCounts.created += 1;
    }
  }

  const importedTeacherIds = new Set(teacherRows.map((row: any) => {
    const nip = String(row?.nip || '').replace(/\s+/g, '');
    return nextTeachers.find(teacher => teacher.nip === nip)?.id;
  }).filter(Boolean));
  const homeroomOwners = new Map<string, { id: string; name: string }>();
  for (const teacher of nextTeachers) {
    if (!teacher.homeroomClass) continue;
    const owner = homeroomOwners.get(teacher.homeroomClass);
    if (owner && (importedTeacherIds.has(owner.id) || importedTeacherIds.has(teacher.id))) {
      errors.push(`Kelas wali ${teacher.homeroomClass} ditetapkan ke lebih dari satu guru/staf (${owner.name} dan ${teacher.fullName}).`);
    } else if (!owner) {
      homeroomOwners.set(teacher.homeroomClass, { id: teacher.id, name: teacher.fullName });
    }
  }

  if (errors.length) {
    return res.status(400).json({
      message: `Impor dibatalkan karena ada ${errors.length} kesalahan. Tidak ada data yang diubah. ${errors.slice(0, 10).join(' ')}${errors.length > 10 ? ' Perbaiki kesalahan lainnya pada file.' : ''}`
    });
  }

  db.students = nextStudents;
  db.teachers = nextTeachers;
  for (const student of nextStudents.filter(item => studentSeen.has(item.nisn))) {
    const user = db.users.find(item =>
      item.role === 'siswa' && (item.linkedId === student.id || item.username === student.nisn)
    );
    if (user) {
      user.fullName = student.fullName;
      user.email = String(student.email || '');
    }
  }
  for (const teacher of nextTeachers.filter(item => teacherSeen.has(item.nip))) {
    const user = db.users.find(item =>
      ['guru', 'kepala_sekolah', 'ketua_kombel'].includes(item.role) &&
      (item.linkedId === teacher.id || item.username === teacher.nip)
    );
    if (user) {
      user.fullName = teacher.fullName;
      user.email = teacher.email;
    }
  }

  await saveDb();
  res.json({
    message: 'Sinkronisasi data siswa dan guru/staf berhasil.',
    students: studentCounts,
    teachers: teacherCounts
  });
});

app.post('/api/teachers', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.fullName || !body.nip || !body.subject) {
      return res.status(400).json({ message: 'Nama lengkap, NIP, dan mata pelajaran wajib diisi.' });
    }
    const db = await getDb();
    const nip = String(body.nip).trim();
    if (db.teachers.some(teacher => teacher.nip === nip) || db.users.some(user => user.username === nip)) {
      return res.status(409).json({ message: 'NIP tersebut sudah terdaftar.' });
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) {
      return res.status(400).json({ message: 'Email aktif guru wajib diisi agar pemulihan kata sandi dapat digunakan.' });
    }
    const homeroomClass = String(body.homeroomClass || '').trim();
    if (homeroomClass && db.teachers.some(teacher => teacher.homeroomClass === homeroomClass)) {
      return res.status(409).json({ message: 'Kelas tersebut sudah memiliki wali kelas.' });
    }
    let photoUrl = body.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400';
    if (photoUrl.startsWith('data:image/')) photoUrl = await persistImage(photoUrl, 'teacher');

    const item: Teacher = {
      id: `tch-${Date.now()}`,
      nip: String(body.nip).trim(),
      fullName: String(body.fullName).trim(),
      degree: String(body.degree || '').trim(),
      subject: String(body.subject).trim(),
      department: body.department || 'MIPA',
      classesTaught: Array.isArray(body.classesTaught) ? body.classesTaught : ['X-A'],
      homeroomClass,
      education: String(body.education || '').trim(),
      email: String(body.email || '').trim(),
      phone: String(body.phone || '-').trim(),
      photoUrl,
      bio: String(body.bio || '').trim()
    };

    db.teachers.push(item);

    // Auto-create teacher user account
    const salt = generateSalt();
    const temporaryPassword = crypto.randomBytes(18).toString('base64url');
    const hash = hashPassword(temporaryPassword, salt);
    db.users.push({
      id: `usr-${item.id}`,
      username: item.nip,
      passwordHash: hash,
      salt,
      role: 'guru',
      fullName: item.fullName,
      email: item.email,
      linkedId: item.id,
      avatarUrl: item.photoUrl,
      mustChangePassword: true
    });

    await saveDb();
    res.status(201).json({ item, username: item.nip, temporaryPassword });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Gagal menambahkan data guru.' });
  }
});

app.put('/api/teachers/:id', requireAdminOrKombel, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    if (req.user?.role === 'ketua_kombel' && req.user.linkedId !== req.params.id) {
      return res.status(403).json({ message: 'Ketua KOMBEL hanya dapat mengubah profilnya sendiri.' });
    }
    const index = db.teachers.findIndex(t => t.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: 'Guru tidak ditemukan.' });

    const old = db.teachers[index];
    const updates = req.user?.role === 'ketua_kombel'
      ? Object.fromEntries(Object.entries({
          fullName: req.body?.fullName,
          degree: req.body?.degree,
          education: req.body?.education,
          bio: req.body?.bio,
          photoUrl: req.body?.photoUrl
        }).filter(([, value]) => value !== undefined))
      : req.body;
    if (updates?.email !== undefined && updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(updates.email).trim())) {
      return res.status(400).json({ message: 'Format email guru tidak valid.' });
    }
    const homeroomClass = String(updates?.homeroomClass ?? old.homeroomClass ?? '').trim();
    if (
      homeroomClass &&
      db.teachers.some((teacher, teacherIndex) => teacherIndex !== index && teacher.homeroomClass === homeroomClass)
    ) {
      return res.status(409).json({ message: 'Kelas tersebut sudah memiliki wali kelas.' });
    }
    let photoUrl = updates?.photoUrl ?? old.photoUrl;
    if (photoUrl?.startsWith('data:image/')) photoUrl = await persistImage(photoUrl, 'teacher');

    db.teachers[index] = { ...old, ...updates, homeroomClass, id: old.id, photoUrl };

    // Sync full name & email to linked user account if exists
    const user = db.users.find(u => u.linkedId === old.id || u.username === old.nip);
    if (user) {
      user.fullName = db.teachers[index].fullName;
      user.email = db.teachers[index].email;
      user.avatarUrl = db.teachers[index].photoUrl;
    }

    await saveDb();
    res.json(db.teachers[index]);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Gagal memperbarui guru.' });
  }
});

app.delete('/api/teachers/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const item = db.teachers.find(t => t.id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Guru tidak ditemukan.' });

  db.teachers = db.teachers.filter(t => t.id !== req.params.id);
  db.users = db.users.filter(u => u.linkedId !== req.params.id && u.username !== item.nip);
  await safeDeleteImage(item.photoUrl);
  await saveDb();
  res.status(204).end();
});

// ----------------------------------------------------
// 8. STUDENTS (SISWA) CRUD
// ----------------------------------------------------
app.get('/api/students', requireStaff, async (_req, res) => {
  const db = await getDb();
  res.json(db.students);
});

// Students can only read the profile linked to their authenticated account.
app.get('/api/student/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'siswa') {
    return res.status(403).json({ message: 'Endpoint ini hanya tersedia untuk akun siswa.' });
  }
  const db = await getDb();
  const student = db.students.find(item => item.id === req.user?.linkedId || item.nisn === req.user?.username);
  if (!student) return res.status(404).json({ message: 'Profil siswa untuk akun ini tidak ditemukan.' });
  res.json(student);
});

app.get('/api/student/notification-reads', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'siswa') {
    return res.status(403).json({ message: 'Endpoint ini hanya tersedia untuk akun siswa.' });
  }
  const db = await getDb();
  const student = db.students.find(item => item.id === req.user?.linkedId || item.nisn === req.user?.username);
  if (!student) return res.status(404).json({ message: 'Profil siswa untuk akun ini tidak ditemukan.' });
  const result = await pool.query(
    'SELECT notification_key FROM student_notification_reads WHERE student_id = $1',
    [student.id]
  );
  res.json(result.rows.map(row => row.notification_key));
});

app.post('/api/student/notification-reads', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'siswa') {
    return res.status(403).json({ message: 'Endpoint ini hanya tersedia untuk akun siswa.' });
  }
  const keys = req.body?.keys;
  if (!Array.isArray(keys) || keys.length > 500 || keys.some(key => typeof key !== 'string' || !key.trim() || key.length > 4000)) {
    return res.status(400).json({ message: 'Daftar notifikasi yang dibaca tidak valid.' });
  }
  const db = await getDb();
  const student = db.students.find(item => item.id === req.user?.linkedId || item.nisn === req.user?.username);
  if (!student) return res.status(404).json({ message: 'Profil siswa untuk akun ini tidak ditemukan.' });
  if (keys.length) {
    await pool.query(
      `INSERT INTO student_notification_reads (student_id, notification_key)
       SELECT $1, notification_key FROM unnest($2::text[]) AS notification_key
       ON CONFLICT (student_id, notification_key) DO NOTHING`,
      [student.id, [...new Set(keys as string[])]]
    );
  }
  res.status(204).end();
});

app.post('/api/students', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.fullName || !body.nisn) {
      return res.status(400).json({ message: 'Nama lengkap dan NISN siswa wajib diisi.' });
    }

    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) {
      return res.status(400).json({ message: 'Email aktif siswa atau orang tua/wali wajib diisi agar pemulihan kata sandi dapat digunakan.' });
    }
    const db = await getDb();
    const classId = normalizeSchoolClassId(String(body.classId || 'X-A'));
    if (!isSchoolClass(classId)) {
      return res.status(400).json({ message: 'Kelas harus salah satu dari X-A sampai XII-E.' });
    }
    const nisn = String(body.nisn).trim();
    if (db.students.some(student => student.nisn === nisn) || db.users.some(user => user.username === nisn)) {
      return res.status(409).json({ message: 'NISN tersebut sudah terdaftar.' });
    }
    const item: Student = {
      id: `std-${Date.now()}`,
      nisn,
      nis: String(body.nis || body.nisn.slice(-5)).trim(),
      fullName: String(body.fullName).trim(),
      email: String(body.email || '').trim(),
      gender: body.gender || 'Laki-laki',
      classId,
      className: classId,
      academicYear: body.academicYear || '2026/2027',
      homeroomTeacher: body.homeroomTeacher || 'Dra. Sri Wahyuni, M.Si'
    };

    db.students.unshift(item);

    // Auto-create student portal account
    const salt = generateSalt();
    const temporaryPassword = crypto.randomBytes(18).toString('base64url');
    const hash = hashPassword(temporaryPassword, salt);
    db.users.push({
      id: `usr-${item.id}`,
      username: item.nisn,
      passwordHash: hash,
      salt,
      role: 'siswa',
      fullName: item.fullName,
      email: item.email || '',
      linkedId: item.id,
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
      mustChangePassword: true
    });

    await saveDb();
    res.status(201).json({ item, username: item.nisn, temporaryPassword });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Gagal menambahkan siswa.' });
  }
});

app.put('/api/students/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const index = db.students.findIndex(s => s.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: 'Siswa tidak ditemukan.' });

  if (req.body?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(req.body.email).trim())) {
    return res.status(400).json({ message: 'Format email siswa tidak valid.' });
  }
  const classId = normalizeSchoolClassId(String(req.body?.classId || db.students[index].classId));
  if (!isSchoolClass(classId)) {
    return res.status(400).json({ message: 'Kelas harus salah satu dari X-A sampai XII-E.' });
  }
  const { major: _legacyMajor, ...existingStudent } = db.students[index] as Student & { major?: unknown };
  const { major: _submittedMajor, ...studentUpdates } = req.body || {};
  db.students[index] = {
    ...existingStudent,
    ...studentUpdates,
    id: db.students[index].id,
    classId,
    className: classId
  };
  const user = db.users.find(u => u.linkedId === req.params.id || u.username === db.students[index].nisn);
  if (user) {
    user.fullName = db.students[index].fullName;
    user.email = String(db.students[index].email || '').trim();
  }

  await saveDb();
  res.json(db.students[index]);
});

app.delete('/api/students/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const student = db.students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ message: 'Siswa tidak ditemukan.' });

  db.students = db.students.filter(s => s.id !== req.params.id);
  db.users = db.users.filter(u => u.linkedId !== req.params.id && u.username !== student.nisn);
  await saveDb();
  res.status(204).end();
});

// ----------------------------------------------------
// 9. SCHEDULES (JADWAL PELAJARAN)
// ----------------------------------------------------
app.get('/api/schedules', async (_req, res) => {
  const db = await getDb();
  res.json(db.schedules);
});

app.post('/api/schedules', requireAdminOrTeacher, async (req, res) => {
  const body = req.body || {};
  if (!body.subject || !body.day || !body.classId) {
    return res.status(400).json({ message: 'Mata pelajaran, hari, dan kelas wajib diisi.' });
  }

  const item: ScheduleItem = {
    id: `sch-${Date.now()}`,
    day: body.day,
    startTime: body.startTime || '07.00',
    endTime: body.endTime || '08.30',
    subject: String(body.subject).trim(),
    teacherName: String(body.teacherName || 'Guru Mata Pelajaran').trim(),
    teacherId: body.teacherId,
    classId: body.classId,
    room: body.room ? String(body.room).trim() : 'Ruang Teori',
    colorTag: body.colorTag || 'blue',
    updatedAt: new Date().toISOString()
  };

  const db = await getDb();
  db.schedules.push(item);
  await saveDb();
  res.status(201).json(item);
});

app.put('/api/schedules/:id', requireAdminOrTeacher, async (req, res) => {
  const db = await getDb();
  const index = db.schedules.findIndex(s => s.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });

  db.schedules[index] = {
    ...db.schedules[index],
    ...req.body,
    id: db.schedules[index].id,
    updatedAt: new Date().toISOString()
  };
  await saveDb();
  res.json(db.schedules[index]);
});

app.delete('/api/schedules/:id', requireAdminOrTeacher, async (req, res) => {
  const db = await getDb();
  db.schedules = db.schedules.filter(s => s.id !== req.params.id);
  await saveDb();
  res.status(204).end();
});

app.get('/api/portal-announcements', requireAuth, async (_req, res) => {
  const db = await getDb();
  res.json(db.portalAnnouncements);
});

app.post('/api/portal-announcements', requireStaff, async (req: AuthenticatedRequest, res) => {
  const body = req.body || {};
  if (!body.title || !body.content) {
    return res.status(400).json({ message: 'Judul dan isi pengumuman wajib diisi.' });
  }

  const db = await getDb();
  const teacher = db.teachers.find(item => item.id === req.user?.linkedId || item.nip === req.user?.username);
  const item: PortalAnnouncement = {
    id: `pa-${Date.now()}`,
    title: String(body.title).trim(),
    category: body.category || 'Umum',
    targetClass: body.targetClass,
    content: String(body.content).trim(),
    teacherId: teacher?.id || req.user?.linkedId || '',
    teacherName: teacher?.fullName || req.user?.fullName || 'Guru',
    createdAt: new Date().toISOString(),
    isImportant: Boolean(body.isImportant)
  };
  db.portalAnnouncements.unshift(item);
  await saveDb();
  res.status(201).json(item);
});

app.put('/api/portal-announcements/:id', requireStaff, async (req: AuthenticatedRequest, res) => {
  const db = await getDb();
  const index = db.portalAnnouncements.findIndex(item => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: 'Pengumuman portal tidak ditemukan.' });
  const existing = db.portalAnnouncements[index];
  const teacher = db.teachers.find(item => item.id === req.user?.linkedId || item.nip === req.user?.username);
  if (req.user?.role === 'guru' && existing.teacherId !== (teacher?.id || req.user.linkedId)) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke pengumuman ini.' });
  }

  db.portalAnnouncements[index] = {
    ...existing,
    ...req.body,
    id: existing.id,
    teacherId: existing.teacherId,
    teacherName: existing.teacherName
  };
  await saveDb();
  res.json(db.portalAnnouncements[index]);
});

app.delete('/api/portal-announcements/:id', requireStaff, async (req: AuthenticatedRequest, res) => {
  const db = await getDb();
  const existing = db.portalAnnouncements.find(item => item.id === req.params.id);
  if (!existing) return res.status(404).json({ message: 'Pengumuman portal tidak ditemukan.' });
  const teacher = db.teachers.find(item => item.id === req.user?.linkedId || item.nip === req.user?.username);
  if (req.user?.role === 'guru' && existing.teacherId !== (teacher?.id || req.user.linkedId)) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke pengumuman ini.' });
  }

  db.portalAnnouncements = db.portalAnnouncements.filter(item => item.id !== req.params.id);
  await saveDb();
  res.status(204).end();
});

// ----------------------------------------------------
// 10. PPDB (PENERIMAAN SISWA BARU)
// ----------------------------------------------------
app.get('/api/ppdb', requireStaff, async (_req, res) => {
  const db = await getDb();
  res.json(db.ppdb);
});

app.post('/api/ppdb/status', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (consumePublicActionLimit(`ppdb-status:${ip}`, 10, 10 * 60 * 1000)) {
    return res.status(429).json({ message: 'Terlalu banyak pemeriksaan status. Silakan coba lagi nanti.' });
  }

  const registrationNumber = typeof req.body?.registrationNumber === 'string'
    ? req.body.registrationNumber.trim().toUpperCase()
    : '';
  const nisn = typeof req.body?.nisn === 'string' ? req.body.nisn.trim() : '';
  if (!registrationNumber || !/^\d{10,20}$/.test(nisn)) {
    return res.status(400).json({ message: 'Nomor registrasi dan NISN yang valid wajib diisi.' });
  }

  const db = await getDb();
  const result = db.ppdb.find(applicant =>
    applicant.registrationNumber.toUpperCase() === registrationNumber && applicant.nisn === nisn
  );

  if (!result) return res.status(404).json({ message: 'Data pendaftaran tidak ditemukan. Periksa kembali nomor registrasi dan NISN.' });
  res.json({
    registrationNumber: result.registrationNumber,
    status: result.status,
    registeredAt: result.registeredAt
  });
});

app.post('/api/ppdb', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.fullName || !body.nisn || !body.phone) {
      return res.status(400).json({ message: 'Nama lengkap, NISN, dan nomor telepon wajib diisi.' });
    }

    const regNum = `PPDB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const item: PPDBApplicant = {
      id: `ppdb-${Date.now()}`,
      registrationNumber: regNum,
      nisn: String(body.nisn).trim(),
      nik: String(body.nik || '8202000000000000').trim(),
      fullName: String(body.fullName).trim(),
      gender: body.gender || 'Laki-laki',
      birthPlaceDate: body.birthPlaceDate || 'Weda, 01 Januari 2011',
      phone: String(body.phone).trim(),
      email: body.email ? String(body.email).trim() : `${body.fullName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      address: body.address ? String(body.address).trim() : 'Kabupaten Halmahera Tengah',
      previousSchool: body.previousSchool ? String(body.previousSchool).trim() : 'SMP / MTs Sederajat',
      track: body.track || 'Zonasi',
      averageReportScore: Number(body.averageReportScore) || 85,
      status: 'Menunggu Verifikasi',
      registeredAt: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIT',
      committeeNotes: 'Berkas pendaftaran telah diterima sistem sekolah dan sedang dalam antrean verifikasi panitia.'
    };

    const db = await getDb();
    db.ppdb.unshift(item);
    await saveDb();
    res.status(201).json(item);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Gagal mengirimkan formulir PPDB.' });
  }
});

app.put('/api/ppdb/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const index = db.ppdb.findIndex(p => p.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: 'Pendaftar PPDB tidak ditemukan.' });

  db.ppdb[index] = { ...db.ppdb[index], ...req.body, id: db.ppdb[index].id };
  await saveDb();
  res.json(db.ppdb[index]);
});

app.delete('/api/ppdb/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  db.ppdb = db.ppdb.filter(p => p.id !== req.params.id);
  await saveDb();
  res.status(204).end();
});

// ----------------------------------------------------
// 11. CONTACT MESSAGES (LAYANAN PENGADUAN & HUBUNGI KAMI)
// ----------------------------------------------------
app.get('/api/contact-info', async (_req, res) => {
  const db = await getDb();
  res.json(db.contactInfo);
});

app.put('/api/contact-info', requireAdmin, async (req, res) => {
  const fields: (keyof ContactInfo)[] = [
    'address',
    'phone',
    'whatsapp',
    'publicEmail',
    'ppdbEmail',
    'weekdayHours',
    'fridayHours',
    'footerHours',
    'instagramUrl',
    'facebookUrl',
    'youtubeUrl'
  ];
  const submitted = req.body as Partial<Record<keyof ContactInfo, unknown>> | null;
  if (!submitted || typeof submitted !== 'object') {
    return res.status(400).json({ message: 'Data informasi kontak tidak valid.' });
  }

  const contactInfo = {} as ContactInfo;
  for (const field of fields) {
    const value = submitted[field];
    if (typeof value !== 'string' || value.length > 500) {
      return res.status(400).json({ message: `Kolom ${field} wajib berupa teks maksimal 500 karakter.` });
    }
    contactInfo[field] = value.trim();
  }

  for (const field of ['publicEmail', 'ppdbEmail'] as const) {
    const email = contactInfo[field];
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: `Alamat email ${field} tidak valid.` });
    }
  }

  for (const field of ['instagramUrl', 'facebookUrl', 'youtubeUrl'] as const) {
    try {
      if (new URL(contactInfo[field]).protocol !== 'https:') throw new Error('Invalid protocol');
    } catch {
      return res.status(400).json({ message: `Tautan ${field} harus berupa URL HTTPS yang valid.` });
    }
  }

  const db = await getDb();
  db.contactInfo = contactInfo;
  await saveDb();
  res.json(db.contactInfo);
});

app.get('/api/contact', requireAdmin, async (_req, res) => {
  const db = await getDb();
  res.json(db.messages);
});

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Nama, email, dan pesan wajib diisi.' });
  }

  const item: ContactMessage = {
    id: `msg-${Date.now()}`,
    name: String(name).trim(),
    email: String(email).trim(),
    phone: phone ? String(phone).trim() : '-',
    subject: subject ? String(subject).trim() : 'Pertanyaan Umum',
    message: String(message).trim(),
    createdAt: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIT',
    status: 'Baru'
  };

  const db = await getDb();
  db.messages.unshift(item);
  await saveDb();
  res.status(201).json({ message: 'Pesan Anda telah berhasil dikirim ke pihak SMAN 1 Halmahera Tengah.' });
});

app.post('/api/contact/:id/reply', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const replyMessage = typeof req.body?.replyMessage === 'string' ? req.body.replyMessage.trim() : '';
  if (!replyMessage) {
    return res.status(400).json({ message: 'Isi balasan wajib diisi.' });
  }
  if (replyMessage.length > 10000) {
    return res.status(400).json({ message: 'Balasan maksimal 10.000 karakter.' });
  }

  const db = await getDb();
  const message = db.messages.find(item => item.id === req.params.id);
  if (!message) {
    return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email)) {
    return res.status(400).json({ message: 'Alamat email pengirim tidak valid.' });
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const fromAddress = process.env.SMTP_FROM_EMAIL || user;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !fromAddress) {
    return res.status(503).json({
      message: 'Layanan email belum dikonfigurasi. Lengkapi SMTP_HOST, SMTP_PORT, SMTP_USER, dan SMTP_PASSWORD pada konfigurasi server.'
    });
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE.toLowerCase() === 'true'
      : port === 465,
    auth: { user, pass }
  });

  try {
    await transporter.sendMail({
      from: {
        name: process.env.SMTP_FROM_NAME || 'SMA Negeri 1 Halmahera Tengah',
        address: fromAddress
      },
      to: message.email,
      subject: `Balasan: ${message.subject || 'Pesan untuk sekolah'}`,
      text: [
        `Yth. ${message.name},`,
        '',
        replyMessage,
        '',
        'Hormat kami,',
        'SMA Negeri 1 Halmahera Tengah'
      ].join('\n')
    });
  } catch (error) {
    console.error('Gagal mengirim balasan email untuk pesan kontak:', error);
    return res.status(502).json({ message: 'Email balasan gagal dikirim. Periksa konfigurasi dan koneksi SMTP, lalu coba lagi.' });
  }

  message.replyMessage = replyMessage;
  message.repliedAt = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIT';
  message.repliedBy = req.user?.fullName || 'Admin Sekolah';
  message.status = 'Dibalas';
  await saveDb();

  res.json(message);
});

app.put('/api/contact/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const index = db.messages.findIndex(m => m.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: 'Pesan tidak ditemukan.' });

  db.messages[index] = { ...db.messages[index], ...req.body, id: db.messages[index].id };
  await saveDb();
  res.json(db.messages[index]);
});

app.delete('/api/contact/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  db.messages = db.messages.filter(m => m.id !== req.params.id);
  await saveDb();
  res.status(204).end();
});

// ----------------------------------------------------
// 12. ASSIGNMENTS & SUBMISSIONS (TUGAS & PENGUMPULAN)
// ----------------------------------------------------
app.get('/api/assignments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const db = await getDb();
  let results = [...db.assignments];

  if (req.user?.role === 'siswa') {
    const student = db.students.find(item => item.id === req.user?.linkedId || item.nisn === req.user?.username);
    results = student ? results.filter(item => item.classId === student.classId) : [];
  } else if (req.user?.role === 'guru' || req.user?.role === 'ketua_kombel') {
    const teacher = db.teachers.find(item => item.id === req.user?.linkedId || item.nip === req.user?.username);
    results = teacher ? results.filter(item => item.teacherId === teacher.id) : [];
  } else if (req.user?.role !== 'admin' && req.user?.role !== 'kepala_sekolah') {
    return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk melihat tugas.' });
  }

  if (req.user?.role !== 'siswa' && req.query.classId) {
    results = results.filter(item => item.classId === String(req.query.classId));
  }
  if (req.user?.role !== 'guru' && req.user?.role !== 'ketua_kombel' && req.query.teacherId) {
    results = results.filter(item => item.teacherId === String(req.query.teacherId));
  }

  res.json(results);
});

app.post('/api/assignments', requireAdminOrTeacher, async (req, res) => {
  const body = req.body || {};
  if (!body.title || !body.subject || !body.classId) {
    return res.status(400).json({ message: 'Judul, mata pelajaran, dan kelas wajib diisi.' });
  }

  const item: Assignment = {
    id: `asg-${Date.now()}`,
    subject: String(body.subject).trim(),
    teacherId: body.teacherId || 'tch-1',
    teacherName: String(body.teacherName || 'Guru Pengampu').trim(),
    classId: String(body.classId).trim(),
    className: String(body.className || body.classId).trim(),
    title: String(body.title).trim(),
    description: String(body.description || '').trim(),
    deadline: body.deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
    maxScore: Number(body.maxScore) || 100,
    attachmentName: body.attachmentName,
    createdAt: new Date().toISOString()
  };

  const db = await getDb();
  db.assignments.unshift(item);
  await saveDb();
  res.status(201).json(item);
});

app.put('/api/assignments/:id', requireAdminOrTeacher, async (req, res) => {
  const db = await getDb();
  const index = db.assignments.findIndex(a => a.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });

  db.assignments[index] = { ...db.assignments[index], ...req.body, id: db.assignments[index].id };
  await saveDb();
  res.json(db.assignments[index]);
});

app.delete('/api/assignments/:id', requireAdminOrTeacher, async (req, res) => {
  const db = await getDb();
  db.assignments = db.assignments.filter(a => a.id !== req.params.id);
  db.submissions = db.submissions.filter(s => s.assignmentId !== req.params.id);
  await saveDb();
  res.status(204).end();
});

// Submissions
app.get('/api/submissions/:id/file', requireAdminOrTeacher, async (req: AuthenticatedRequest, res, next) => {
  const db = await getDb();
  const submission = db.submissions.find(item => item.id === req.params.id);
  if (!submission || !submission.linkOrContent.startsWith('/uploads/')) {
    return res.status(404).json({ message: 'Berkas pengumpulan tidak ditemukan.' });
  }

  const assignment = db.assignments.find(item => item.id === submission.assignmentId);
  if (!assignment) return res.status(404).json({ message: 'Tugas pengumpulan tidak ditemukan.' });
  const teacherId = db.teachers.find(
    item => item.id === req.user?.linkedId || item.nip === req.user?.username
  )?.id;
  if (req.user?.role === 'guru' && assignment.teacherId !== teacherId) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke berkas tugas ini.' });
  }

  const filename = path.basename(submission.linkOrContent);
  const { rows } = await pool.query<{ mime_type: string; content: Buffer }>(
    'SELECT mime_type, content FROM uploaded_files WHERE id = $1', [filename]
  );
  if (!rows[0]) return res.status(404).json({ message: 'File unggahan tidak ditemukan di PostgreSQL.' });
  res.type(rows[0].mime_type).set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(submission.fileName || `jawaban-${submission.id}`)}`);
  res.send(rows[0].content);
});

app.get('/api/submissions', requireAuth, async (req: AuthenticatedRequest, res) => {
  const db = await getDb();
  const assignmentId = req.query.assignmentId ? String(req.query.assignmentId) : undefined;
  const studentId = req.query.studentId ? String(req.query.studentId) : undefined;

  let results = [...db.submissions];
  // If student role, only see own submissions
  if (req.user?.role === 'siswa') {
    results = results.filter(s => s.studentId === req.user?.linkedId || s.studentNisn === req.user?.username);
  } else {
    if (assignmentId) results = results.filter(s => s.assignmentId === assignmentId);
    if (studentId) results = results.filter(s => s.studentId === studentId);
  }

  res.json(results);
});

app.post('/api/submissions', requireAuth, upload.single('file'), async (req: AuthenticatedRequest & { file?: Express.Multer.File }, res) => {
  const body = req.body || {};
  // Allow submissions with a file upload (linkOrContent may be empty in that case)
  if (!body.assignmentId) {
    return res.status(400).json({ message: 'Assignment ID wajib diisi.' });
  }
  // If a file was uploaded, set appropriate fields
  if (req.file) {
    body.submissionType = 'file';
    body.fileName = req.file.originalname;
    body.fileSize = `${req.file.size}`;
    body.linkOrContent = await persistUploadedFile(req.file);
  } else if (!body.linkOrContent) {
    // For text/link submissions, linkOrContent must be provided
    return res.status(400).json({ message: 'Jawaban atau tautan tugas wajib diisi.' });
  }

  const db = await getDb();
  const assignment = db.assignments.find(a => a.id === body.assignmentId);
  if (!assignment) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });

  const isLate = new Date() > new Date(assignment.deadline);
  const existingIndex = db.submissions.findIndex(
    s => s.assignmentId === body.assignmentId && (s.studentId === req.user?.linkedId || s.studentNisn === req.user?.username)
  );

  const submissionItem: AssignmentSubmission = {
    id: existingIndex >= 0 ? db.submissions[existingIndex].id : `sub-${Date.now()}`,
    assignmentId: body.assignmentId,
    studentId: req.user?.linkedId || `std-${req.user?.username}`,
    studentName: req.user?.fullName || 'Siswa',
    studentNisn: req.user?.username || '',
    classId: assignment.classId,
    submittedAt: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIT',
    submissionType: body.submissionType || 'text',
    fileName: body.fileName,
    fileSize: body.fileSize,
    linkOrContent: String(body.linkOrContent).trim(),
    status: isLate ? 'Terlambat' : 'Terkumpul'
  };

  if (existingIndex >= 0) {
    db.submissions[existingIndex] = {
      ...db.submissions[existingIndex],
      ...submissionItem,
      score: db.submissions[existingIndex].score,
      feedback: db.submissions[existingIndex].feedback
    };
  } else {
    db.submissions.unshift(submissionItem);
  }

  await saveDb();
  res.status(201).json(submissionItem);
});

app.put('/api/submissions/:id/grade', requireAdminOrTeacher, async (req: AuthenticatedRequest, res) => {
  const { score, feedback } = req.body || {};

  // Validasi nilai
  if (
    score === undefined ||
    score === null ||
    String(score).trim() === '' ||
    !Number.isFinite(Number(score))
  ) {
    return res.status(400).json({ message: 'Nilai harus berupa angka yang valid.' });
  }

  const db = await getDb();
  const index = db.submissions.findIndex(s => s.id === req.params.id);

  if (index < 0) {
    return res.status(404).json({ message: 'Pengumpulan tugas tidak ditemukan.' });
  }

  const submission = db.submissions[index];
  const assignment = db.assignments.find(a => a.id === submission.assignmentId);

  if (!assignment) {
    return res.status(404).json({ message: 'Tugas terkait tidak ditemukan.' });
  }

  // Guru hanya boleh menilai tugas yang diampunya.
  // Admin tetap memiliki kewenangan penuh.
  if (
    req.user?.role === 'guru' &&
    (!req.user.linkedId || assignment.teacherId !== req.user.linkedId)
  ) {
    return res.status(403).json({ message: 'Anda tidak berwenang menilai tugas ini.' });
  }

  const numericScore = Number(score);
  const maxScore = Number(assignment.maxScore);

  if (
    !Number.isFinite(maxScore) ||
    numericScore < 0 ||
    numericScore > maxScore
  ) {
    return res.status(400).json({
      message: `Nilai harus berada antara 0 dan ${maxScore}.`
    });
  }

  if (feedback !== undefined && typeof feedback !== 'string') {
    return res.status(400).json({ message: 'Umpan balik harus berupa teks.' });
  }

  if (typeof feedback === 'string' && feedback.length > 5000) {
    return res.status(400).json({ message: 'Umpan balik maksimal 5000 karakter.' });
  }

  submission.score = numericScore;
  submission.feedback = String(feedback || '').trim();
  submission.status = 'Dinilai';
  submission.gradedAt = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) + ' WIT';
  submission.gradedBy = req.user?.fullName || 'Guru Pengampu';

  await saveDb();
  res.json(submission);
});

// API routes above must get the request first. Unknown /api/* paths return JSON 404
// (never index.html), and only GET/HEAD browser navigations fall back to the SPA.
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Endpoint API tidak ditemukan.' });
});

app.use(async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  // Missing files with an extension (e.g. /foo.js, /img.png) should 404, not return HTML.
  if (path.extname(req.path)) return res.status(404).type('text/plain').send('Not found');
  try {
    if (vite) {
      const raw = await fs.readFile(path.join(ROOT, 'index.html'), 'utf-8');
      const html = await vite.transformIndexHtml(req.originalUrl, raw);
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    } else {
      res.sendFile(path.join(DIST_DIR, 'index.html'), (error) => {
        if (error) next(error);
      });
    }
  } catch (error) {
    if (vite && error instanceof Error) vite.ssrFixStacktrace(error);
    next(error);
  }
});

// Central error handler (no stack traces to the client).
app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server error]', req.method, req.path, error instanceof Error ? error.message : error);
  if (res.headersSent) return;
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
  res.status(500).type('text/plain').send('Terjadi kesalahan pada server.');
});

await pool.query('SELECT 1');
await fs.mkdir(UPLOAD_DIR, { recursive: true });
for (const filename of await fs.readdir(UPLOAD_DIR)) {
  const filePath = path.join(UPLOAD_DIR, filename);
  const stat = await fs.stat(filePath).catch(() => undefined);
  if (!stat?.isFile()) continue;
  const content = await fs.readFile(filePath);
  const mimeType = filename.match(/\.png$/i) ? 'image/png' : filename.match(/\.webp$/i) ? 'image/webp' : filename.match(/\.pdf$/i) ? 'application/pdf' : filename.match(/\.docx$/i) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : filename.match(/\.doc$/i) ? 'application/msword' : 'image/jpeg';
  await pool.query(
    'INSERT INTO uploaded_files (id, original_name, mime_type, size_bytes, content) VALUES ($1, $1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
    [filename, mimeType, content.length, content]
  );
}
console.log('Koneksi PostgreSQL berhasil.');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EDUPORTAL berjalan di http://localhost:${PORT}`);
});
