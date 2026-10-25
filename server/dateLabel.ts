const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** "21 Oktober 2026" (format teks yang dipakai frontend). */
export function formatDateLabel(date: Date = new Date()): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "2026-10-21" (format untuk kolom date PostgreSQL). */
export function todayIso(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "2026-10-21" -> "21 Oktober 2026" */
export function labelFromIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * Mengubah "20 Oktober 2026" atau "2026-10-20" menjadi "2026-10-20".
 * Mengembalikan null jika formatnya tidak dikenali / tanggalnya tidak valid.
 */
export function parseDateLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();

  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) {
    y = Number(iso[1]); m = Number(iso[2]); d = Number(iso[3]);
  } else {
    const id = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(text);
    if (!id) return null;
    const idx = MONTHS.findIndex(name => name.toLowerCase() === id[2].toLowerCase());
    if (idx < 0) return null;
    y = Number(id[3]); m = idx + 1; d = Number(id[1]);
  }

  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}