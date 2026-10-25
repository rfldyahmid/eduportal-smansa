import type { PoolClient } from 'pg';
import { pool } from '../pg';
import { labelFromIso, parseDateLabel, todayIso } from '../dateLabel';
import type { Announcement } from '../../src/types/index';

export const ANNOUNCEMENT_CATEGORIES = ['Akademik', 'Prestasi', 'PPDB', 'Kegiatan', 'Umum'] as const;

export class ValidationError extends Error {}

interface Row {
  id: string;
  title: string;
  category: Announcement['category'];
  published_on: string; // 'YYYY-MM-DD'
  author: string;
  summary: string;
  content: string;
  created_at: Date | null;
  is_important: boolean;
  date_label: string | null;
  images: string[];
}

const SELECT_SQL = `
  SELECT a.id, a.title, a.category,
         to_char(a.published_on, 'YYYY-MM-DD') AS published_on,
         a.author, a.summary, a.content, a.created_at, a.is_important, a.date_label,
         COALESCE(
           array_agg(i.image_url ORDER BY i.position) FILTER (WHERE i.image_url IS NOT NULL),
           '{}'
         ) AS images
  FROM announcements a
  LEFT JOIN announcement_images i ON i.announcement_id = a.id
`;

function toAnnouncement(row: Row): Announcement {
  const item: Announcement = {
    id: row.id,
    title: row.title,
    category: row.category,
    date: row.date_label ?? labelFromIso(row.published_on),
    author: row.author,
    summary: row.summary,
    content: row.content,
    image: row.images[0] ?? '',
    images: row.images,
    isImportant: row.is_important,
  };
  if (row.created_at) item.createdAt = row.created_at.toISOString();
  return item;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const { rows } = await pool.query<Row>(`
    ${SELECT_SQL}
    GROUP BY a.id
    ORDER BY a.published_on DESC, a.created_at DESC NULLS LAST, a.id DESC
  `);
  return rows.map(toAnnouncement);
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const { rows } = await pool.query<Row>(`${SELECT_SQL} WHERE a.id = $1 GROUP BY a.id`, [id]);
  return rows[0] ? toAnnouncement(rows[0]) : null;
}

export async function countAnnouncements(): Promise<number> {
  const { rows } = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM announcements');
  return rows[0].n;
}

async function replaceImages(client: PoolClient, id: string, images: string[]) {
  await client.query('DELETE FROM announcement_images WHERE announcement_id = $1', [id]);
  if (images.length === 0) return;
  await client.query(
    `INSERT INTO announcement_images (announcement_id, position, image_url)
     SELECT $1, ord - 1, url
     FROM unnest($2::text[]) WITH ORDINALITY AS t(url, ord)`,
    [id, images],
  );
}

async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export interface NewAnnouncement {
  id: string;
  title: string;
  category: string;
  date: string; // teks tanggal dari frontend
  author: string;
  summary: string;
  content: string;
  images: string[];
  isImportant: boolean;
}

export async function createAnnouncement(input: NewAnnouncement): Promise<Announcement> {
  if (!(ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(input.category)) {
    throw new ValidationError('Kategori pengumuman tidak valid.');
  }
  const publishedOn = parseDateLabel(input.date) ?? todayIso();

  await inTransaction(async client => {
    await client.query(
      `INSERT INTO announcements
         (id, title, category, published_on, date_label, author, summary, content, is_important, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
      [input.id, input.title, input.category, publishedOn, input.date,
       input.author, input.summary, input.content, input.isImportant],
    );
    await replaceImages(client, input.id, input.images);
  });

  return (await getAnnouncement(input.id))!;
}

export async function updateAnnouncement(
  id: string,
  fields: Record<string, unknown>,
  images: string[],
): Promise<Announcement | null> {
  const sets: string[] = [];
  const params: unknown[] = [id];
  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  for (const [key, column, label] of [
    ['title', 'title', 'Judul'],
    ['author', 'author', 'Penulis'],
    ['summary', 'summary', 'Ringkasan'],
    ['content', 'content', 'Isi'],
  ] as const) {
    if (fields[key] === undefined) continue;
    const value = String(fields[key]).trim();
    if (!value) throw new ValidationError(`${label} tidak boleh kosong.`);
    set(column, value);
  }

  if (fields.category !== undefined) {
    if (!(ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(String(fields.category))) {
      throw new ValidationError('Kategori pengumuman tidak valid.');
    }
    set('category', fields.category);
  }

  if (fields.date !== undefined) {
    set('date_label', String(fields.date));
    const iso = parseDateLabel(fields.date);
    if (iso) set('published_on', iso);
  }

  if (fields.isImportant !== undefined) set('is_important', Boolean(fields.isImportant));

  const found = await inTransaction(async client => {
    if (sets.length > 0) {
      const res = await client.query(
        `UPDATE announcements SET ${sets.join(', ')} WHERE id = $1`,
        params,
      );
      if (res.rowCount === 0) return false;
    } else {
      const res = await client.query('SELECT 1 FROM announcements WHERE id = $1', [id]);
      if (res.rowCount === 0) return false;
    }
    await replaceImages(client, id, images);
    return true;
  });

  return found ? getAnnouncement(id) : null;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const res = await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}