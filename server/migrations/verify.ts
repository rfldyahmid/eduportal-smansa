import 'dotenv/config';
import { getDb, saveDb } from '../db';
import { pool } from '../pg';

const checks = [
  ['users', 'users'],
  ['students', 'students'],
  ['teachers', 'teachers'],
  ['schedules', 'schedules'],
  ['ppdb', 'ppdb_applicants'],
  ['messages', 'contact_messages'],
  ['announcements', 'announcements'],
  ['gallery', 'gallery_photos'],
  ['videos', 'youtube_videos'],
  ['kombelActivities', 'kombel_activities'],
  ['kombelAgendas', 'kombel_agendas'],
  ['assignments', 'assignments'],
  ['submissions', 'assignment_submissions'],
  ['portalAnnouncements', 'portal_announcements'],
  ['passwordResets', 'password_reset_requests']
] as const;

try {
  const { rows: migrations } = await pool.query<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  const { rows: stateRows } = await pool.query<{ revision: string; state: Record<string, unknown> }>(
    'SELECT revision, state FROM application_state WHERE id = 1'
  );
  if (!stateRows[0]) {
    throw new Error('application_state belum berisi data; jalankan npm run db:bootstrap.');
  }

  const missingCollections = checks
    .map(([key]) => key)
    .filter(key => !Array.isArray(stateRows[0].state[key]));
  if (missingCollections.length) {
    throw new Error(`Koleksi PostgreSQL tidak ditemukan: ${missingCollections.join(', ')}.`);
  }

  const db = await getDb();
  const originalAddress = db.contactInfo.address;
  const marker = ` [postgres-verify-${Date.now()}]`;
  let writeVerified = false;

  try {
    db.contactInfo.address = `${originalAddress}${marker}`;
    await saveDb();
    const { rows } = await pool.query<{ address: string }>(
      `SELECT state->'contactInfo'->>'address' AS address
       FROM application_state WHERE id = 1`
    );
    writeVerified = rows[0]?.address === `${originalAddress}${marker}`;
    if (!writeVerified) {
      throw new Error('Perubahan uji tidak ditemukan di application_state PostgreSQL.');
    }
  } finally {
    db.contactInfo.address = originalAddress;
    await saveDb();
  }

  const { rows: restoredRows } = await pool.query<{ address: string; revision: string }>(
    `SELECT state->'contactInfo'->>'address' AS address, revision
     FROM application_state WHERE id = 1`
  );
  if (restoredRows[0]?.address !== originalAddress) {
    throw new Error('Pembersihan perubahan uji gagal; pulihkan alamat melalui portal admin.');
  }

  console.log(`PostgreSQL: terhubung; migrasi: ${migrations.map(row => row.version).join(', ')}.`);
  console.log(`State PostgreSQL: revision ${restoredRows[0].revision}; semua ${checks.length} koleksi tersedia.`);
  console.log('Uji tulis-baca-pulihkan application_state: BERHASIL.');
  for (const [key] of checks) {
    console.log(`${key}: ${db[key].length} record`);
  }
} finally {
  await pool.end();
}
