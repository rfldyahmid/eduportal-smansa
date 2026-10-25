import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../pg';

const MIGRATIONS_DIR = path.dirname(fileURLToPath(import.meta.url));
const client = await pool.connect();

try {
  await client.query('SELECT pg_advisory_lock($1)', [60201143]);
  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter(file => /^\d+_.+\.sql$/.test(file))
    .sort();

  for (const file of files) {
    const version = Number(file.match(/^(\d+)_/)?.[1]);
    const migrationTable = await client.query(
      `SELECT to_regclass('public.schema_migrations') AS table_name`
    );
    if (migrationTable.rows[0].table_name) {
      const applied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [version]
      );
      if (applied.rowCount) {
        console.log(`Migrasi ${version} sudah diterapkan.`);
        continue;
      }
    } else if (version !== 1) {
      throw new Error('Tabel schema_migrations tidak ditemukan; migrasi awal harus dijalankan lebih dulu.');
    }

    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    await client.query(sql);
    console.log(`Migrasi ${version} berhasil diterapkan.`);
  }
} finally {
  await client.query('SELECT pg_advisory_unlock($1)', [60201143]).catch(() => undefined);
  client.release();
  await pool.end();
}
