/**
 * Memindahkan foto base64 di PostgreSQL menjadi file di data/uploads.
 * Percobaan:  npx tsx scripts/extract-base64-images.ts
 * Sungguhan:  npx tsx scripts/extract-base64-images.ts --apply
 * SEBELUM --apply: hentikan server, dan buat backup (database + data/uploads).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool } from '../server/pg';
import { decodeDataUrl } from '../server/dataUrl';

const APPLY = process.argv.includes('--apply');
const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'uploads');

const TARGETS = [
  { table: 'announcement_images', column: 'image_url', prefix: 'announcement' },
  { table: 'gallery_photos', column: 'image_url', prefix: 'gallery' },
  { table: 'gallery_photo_images', column: 'image_url', prefix: 'gallery' },
  { table: 'kombel_activities', column: 'image_url', prefix: 'kombel' },
  { table: 'kombel_activity_images', column: 'image_url', prefix: 'kombel' },
  { table: 'teachers', column: 'photo_url', prefix: 'teacher' },
  { table: 'users', column: 'avatar_url', prefix: 'avatar' },
] as const;

interface Pending { table: string; column: string; rid: string; url: string }

const writtenFiles: string[] = [];
const byHash = new Map<string, string>();

async function columnExists(table: string, column: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return (rowCount ?? 0) > 0;
}

async function saveFile(dataUrl: string, prefix: string): Promise<string | null> {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return null;
  const hash = crypto.createHash('sha1').update(decoded.buffer).digest('hex');
  const existing = byHash.get(hash);
  if (existing) return existing;

  const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${decoded.ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), decoded.buffer);
  writtenFiles.push(filename);
  const publicPath = `/uploads/${filename}`;
  byHash.set(hash, publicPath);
  return publicPath;
}

async function main() {
  console.log(APPLY ? '== MODE SUNGGUHAN (--apply) ==' : '== MODE PERCOBAAN: tidak ada yang diubah ==');
  const updates: Array<Pending & { newPath: string }> = [];
  let skipped = 0;

  for (const t of TARGETS) {
    if (!(await columnExists(t.table, t.column))) {
      console.log(`- ${t.table}.${t.column}: kolom tidak ada, dilewati`);
      continue;
    }
    const { rows } = await pool.query<{ rid: string; url: string }>(
      `SELECT ctid::text AS rid, ${t.column} AS url FROM ${t.table} WHERE ${t.column} LIKE 'data:%'`,
    );
    const totalKb = Math.round(rows.reduce((n, r) => n + r.url.length, 0) / 1024);
    console.log(`- ${t.table}.${t.column}: ${rows.length} baris base64 (${totalKb} KB)`);

    for (const row of rows) {
      const pending: Pending = { table: t.table, column: t.column, rid: row.rid, url: row.url };
      if (!decodeDataUrl(row.url)) {
        skipped++;
        console.log(`  ! baris ${row.rid} bukan gambar yang didukung, dilewati`);
        continue;
      }
      if (!APPLY) { updates.push({ ...pending, newPath: '(akan dibuat)' }); continue; }
      const newPath = await saveFile(row.url, t.prefix);
      if (!newPath) { skipped++; continue; }
      updates.push({ ...pending, newPath });
    }
  }

  if (!APPLY) {
    console.log(`\nAkan diubah: ${updates.length} baris. Dilewati: ${skipped}.`);
    console.log('Jika sesuai harapan, jalankan lagi dengan --apply (setelah backup dan server dihentikan).');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const u of updates) {
      const res = await client.query(
        `UPDATE ${u.table} SET ${u.column} = $1 WHERE ctid = $2::tid AND ${u.column} LIKE 'data:%'`,
        [u.newPath, u.rid],
      );
      if (res.rowCount !== 1) {
        throw new Error(`Update tidak mengenai baris: ${u.table} ${u.rid} (rowCount=${res.rowCount})`);
      }
    }
    await client.query('COMMIT');
    console.log(`\nSelesai: ${updates.length} baris diperbarui, ${writtenFiles.length} file dibuat di ${UPLOAD_DIR}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    for (const f of writtenFiles) await fs.rm(path.join(UPLOAD_DIR, f), { force: true });
    console.error('GAGAL, semua perubahan dibatalkan dan file baru dihapus:', err);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

try {
  await main();
} finally {
  await pool.end();
}