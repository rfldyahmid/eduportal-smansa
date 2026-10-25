import { pool } from './server/pg';

const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
console.log('Koneksi OK, jumlah users:', rows[0].n);
await pool.end();