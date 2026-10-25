const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Mengubah "data:image/png;base64,...." menjadi { ext, buffer }. Null jika bukan gambar yang didukung. */
export function decodeDataUrl(dataUrl: string): { ext: string; buffer: Buffer } | null {
  if (!dataUrl.startsWith('data:image/')) return null;
  const marker = dataUrl.indexOf(';base64,');
  if (marker < 0) return null;
  const mime = dataUrl.slice(5, marker).toLowerCase();
  const ext = EXT[mime];
  if (!ext) return null;
  const base64 = dataUrl.slice(marker + 8).replace(/\s/g, '');
  if (!base64 || /[^A-Za-z0-9+/=]/.test(base64)) return null;
  const buffer = Buffer.from(base64, 'base64');
  return buffer.length > 0 ? { ext, buffer } : null;
}