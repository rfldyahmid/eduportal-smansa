import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDefaults } from '../db';
import { pool } from '../pg';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sourcePath = path.resolve(process.argv[2] || path.join(ROOT, 'data', 'db.json'));

try {
  const parsed: unknown = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('File sumber harus berisi objek database JSON.');
  }

  const state = ensureDefaults(parsed);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT EXISTS (SELECT 1 FROM application_state WHERE id = 1) AS state_exists`
    );
    if (existing.rows[0].state_exists) {
      throw new Error('State PostgreSQL sudah ada. Bootstrap ditolak agar data tidak tertimpa.');
    }

    await client.query(
      `INSERT INTO application_state (id, state, revision)
       VALUES (1, $1::jsonb, 1)`,
      [JSON.stringify(state)]
    );
    await client.query('COMMIT');
    console.log('Bootstrap PostgreSQL berhasil; data JSON sumber tidak diubah.');
    console.log(`Sumber: ${sourcePath}`);
    console.log(`Jumlah akun yang dimuat: ${state.users.length}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
