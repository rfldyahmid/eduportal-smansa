import React, { useState } from 'react';
import { Download, Eye, Paperclip, X } from 'lucide-react';
import { PortalAnnouncement } from '../../types';

interface PortalAnnouncementAttachmentsProps {
  announcement: PortalAnnouncement;
}

export const PortalAnnouncementAttachments: React.FC<PortalAnnouncementAttachmentsProps> = ({ announcement }) => {
  const [previewType, setPreviewType] = useState<'image' | 'file' | null>(null);
  if (!announcement.imageUrl && !announcement.fileUrl) return null;

  const canPreviewFile = ['application/pdf', 'text/plain', 'text/csv'].includes(announcement.fileMimeType || '');

  return (
    <div className="mt-3 space-y-2">
      {announcement.imageUrl && (
        <button type="button" onClick={() => setPreviewType('image')} className="block w-fit cursor-zoom-in text-left">
          <img
            src={announcement.imageUrl}
            alt={announcement.imageName || `Foto lampiran ${announcement.title}`}
            className="max-h-72 max-w-full rounded-lg border border-slate-200 object-contain"
            loading="lazy"
          />
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-blue-900">
            <Eye size={13} aria-hidden="true" /> Pratinjau foto
          </span>
        </button>
      )}
      {announcement.fileUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            <Paperclip size={14} aria-hidden="true" />
            <span className="truncate">{announcement.fileName || 'Lampiran'}</span>
            {announcement.fileSize ? <span className="shrink-0 text-slate-500">({(announcement.fileSize / (1024 * 1024)).toFixed(1)} MB)</span> : null}
          </span>
          <button
            type="button"
            onClick={() => setPreviewType('file')}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50"
          >
            <Eye size={14} aria-hidden="true" /> Pratinjau
          </button>
        </div>
      )}
      {previewType && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
          onMouseDown={() => setPreviewType(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="portal-announcement-preview-title"
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onMouseDown={event => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 id="portal-announcement-preview-title" className="truncate text-sm font-bold text-slate-900">
                {previewType === 'image' ? announcement.imageName || 'Pratinjau foto' : announcement.fileName || 'Pratinjau file'}
              </h2>
              <button
                type="button"
                onClick={() => setPreviewType(null)}
                aria-label="Tutup pratinjau"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
              {previewType === 'image' && announcement.imageUrl ? (
                <img
                  src={announcement.imageUrl}
                  alt={announcement.imageName || `Foto lampiran ${announcement.title}`}
                  className="mx-auto max-h-[72vh] max-w-full object-contain"
                />
              ) : canPreviewFile && announcement.fileUrl ? (
                <iframe
                  src={announcement.fileUrl}
                  title={`Pratinjau ${announcement.fileName || 'lampiran'}`}
                  className="h-[72vh] w-full rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <p className="mx-auto max-w-xl rounded-lg bg-white p-5 text-center text-sm text-slate-600">
                  Pratinjau langsung belum tersedia untuk format file ini. Unduh file untuk membukanya.
                </p>
              )}
            </div>
            {((previewType === 'file' && announcement.fileUrl) || (previewType === 'image' && announcement.imageUrl)) && (
              <footer className="flex justify-end border-t border-slate-200 px-4 py-3">
                <a
                  href={previewType === 'image' ? announcement.imageUrl : announcement.fileUrl}
                  download={previewType === 'image' ? announcement.imageName || true : announcement.fileName || true}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  <Download size={14} aria-hidden="true" /> Unduh {previewType === 'image' ? 'foto' : 'file'}
                </a>
              </footer>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
