import type { Express } from 'express';
import { requireAdmin } from '../auth';
import { formatDateLabel } from '../dateLabel';
import {
  ValidationError,
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from '../repositories/announcements';

interface ImageHelpers {
  persistImage(dataUrl: string, prefix: string): Promise<string>;
  safeDeleteImage(imagePath?: string): Promise<void>;
}

const isDataUrl = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:image/');

function sendError(res: any, err: unknown, fallback: string) {
  if (err instanceof ValidationError) return res.status(400).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: fallback });
}

export function registerAnnouncementRoutes(app: Express, { persistImage, safeDeleteImage }: ImageHelpers) {
  app.get('/api/announcements', async (_req, res) => {
    try {
      res.json(await listAnnouncements());
    } catch (err) {
      sendError(res, err, 'Gagal mengambil pengumuman.');
    }
  });

  app.post('/api/announcements', requireAdmin, async (req, res) => {
    const persisted: string[] = []; // file baru, dihapus lagi jika penyimpanan DB gagal
    try {
      const body = req.body || {};
      if (!body.title || !body.summary || !body.content || !body.category || !body.author) {
        return res.status(400).json({ message: 'Judul, kategori, penulis, ringkasan, dan isi wajib diisi.' });
      }
      const inputImages = body.images === undefined ? [] : body.images;
      if (
        !Array.isArray(inputImages) ||
        inputImages.length > 5 ||
        (inputImages.some(isDataUrl) && (inputImages.length < 3 || inputImages.length > 5))
      ) {
        return res.status(400).json({ message: 'Unggahan harus berisi 3 sampai 5 foto.' });
      }

      const images: string[] = [];
      for (const image of inputImages) {
        if (typeof image !== 'string') throw new ValidationError('Data foto pengumuman tidak valid.');
        if (isDataUrl(image)) {
          const saved = await persistImage(image, 'announcement');
          persisted.push(saved);
          images.push(saved);
        } else {
          images.push(image);
        }
      }

      let image: string = body.image || images[0] || '';
      if (isDataUrl(image)) {
        image = await persistImage(image, 'announcement');
        persisted.push(image);
      }

      const created = await createAnnouncement({
        id: `ann-${Date.now()}`,
        title: String(body.title).trim(),
        category: body.category,
        date: body.date || formatDateLabel(),
        author: String(body.author).trim(),
        summary: String(body.summary).trim(),
        content: String(body.content).trim(),
        images: images.length ? images : image ? [image] : [],
        isImportant: Boolean(body.isImportant),
      });
      res.status(201).json(created);
    } catch (err) {
      for (const file of persisted) await safeDeleteImage(file);
      sendError(res, err, 'Gagal menyimpan pengumuman.');
    }
  });

  app.put('/api/announcements/:id', requireAdmin, async (req, res) => {
    const persisted: string[] = [];
    try {
      const id = String(req.params.id);
      const old = await getAnnouncement(id);
      if (!old) return res.status(404).json({ message: 'Pengumuman tidak ditemukan.' });

      const body = req.body || {};
      const inputImages = body.images;
      if (inputImages !== undefined && (!Array.isArray(inputImages) || inputImages.length > 5)) {
        return res.status(400).json({ message: 'Unggahan maksimal 5 foto.' });
      }
      if (Array.isArray(inputImages) && inputImages.some(isDataUrl) &&
          (inputImages.length < 3 || inputImages.length > 5)) {
        return res.status(400).json({ message: 'Unggah minimal 3 dan maksimal 5 foto.' });
      }

      let images: string[];
      if (inputImages === undefined) {
        images = old.images?.length ? old.images : old.image ? [old.image] : [];
      } else {
        images = [];
        for (const item of inputImages) {
          if (typeof item !== 'string') throw new ValidationError('Data foto pengumuman tidak valid.');
          if (isDataUrl(item)) {
            const saved = await persistImage(item, 'announcement');
            persisted.push(saved);
            images.push(saved);
          } else {
            images.push(item);
          }
        }
      }

      let image: string = inputImages !== undefined ? images[0] || '' : body.image ?? old.image ?? '';
      if (isDataUrl(image)) {
        image = await persistImage(image, 'announcement');
        persisted.push(image);
      }
      const finalImages = images.length ? images : image ? [image] : [];

      const updated = await updateAnnouncement(id, body, finalImages);
      if (!updated) return res.status(404).json({ message: 'Pengumuman tidak ditemukan.' });

      const retained = new Set(finalImages);
      for (const oldImage of new Set([old.image, ...(old.images || [])])) {
        if (oldImage && !retained.has(oldImage)) await safeDeleteImage(oldImage);
      }
      res.json(updated);
    } catch (err) {
      for (const file of persisted) await safeDeleteImage(file);
      sendError(res, err, 'Gagal memperbarui pengumuman.');
    }
  });

  app.delete('/api/announcements/:id', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id);
      const item = await getAnnouncement(id);
      if (!item) return res.status(404).json({ message: 'Pengumuman tidak ditemukan.' });

      await deleteAnnouncement(id);
      for (const image of new Set([item.image, ...(item.images || [])])) {
        await safeDeleteImage(image);
      }
      res.status(204).end();
    } catch (err) {
      sendError(res, err, 'Gagal menghapus pengumuman.');
    }
  });
}