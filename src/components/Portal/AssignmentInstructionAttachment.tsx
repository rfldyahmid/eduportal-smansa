import React, { useEffect, useState } from 'react';
import { Download, Eye, Paperclip, X } from 'lucide-react';
import { Assignment } from '../../types';

interface AssignmentInstructionAttachmentProps {
  assignment: Assignment;
}

export const AssignmentInstructionAttachment: React.FC<AssignmentInstructionAttachmentProps> = ({ assignment }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isImage = assignment.attachmentMimeType?.startsWith('image/') ?? /\.(jpe?g|png|webp)$/i.test(assignment.attachmentName || '');
  const canPreviewPdf = assignment.attachmentMimeType === 'application/pdf' || /\.pdf$/i.test(assignment.attachmentName || '');

  useEffect(() => {
    if (!isPreviewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPreviewOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isPreviewOpen]);

  if (!assignment.attachmentUrl) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700">
          <Paperclip size={15} className="shrink-0 text-blue-900" aria-hidden="true" />
          <span className="truncate">{assignment.attachmentName || 'Lampiran instruksi tugas'}</span>
          {assignment.attachmentSize ? <span className="shrink-0 text-[10px] font-normal text-slate-500">({(assignment.attachmentSize / (1024 * 1024)).toFixed(1)} MB)</span> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-900 transition hover:bg-blue-50"
          >
            <Eye size={14} aria-hidden="true" /> Pratinjau
          </button>
          <a
            href={assignment.attachmentUrl}
            download={assignment.attachmentName || true}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800"
          >
            <Download size={14} aria-hidden="true" /> Unduh
          </a>
        </div>
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 sm:p-6" onMouseDown={() => setIsPreviewOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`assignment-attachment-title-${assignment.id}`}
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onMouseDown={event => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 id={`assignment-attachment-title-${assignment.id}`} className="truncate text-sm font-bold text-slate-900">
                {assignment.attachmentName || 'Pratinjau lampiran tugas'}
              </h2>
              <button type="button" onClick={() => setIsPreviewOpen(false)} aria-label="Tutup pratinjau lampiran" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <X size={18} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-5">
              {isImage ? (
                <img src={assignment.attachmentUrl} alt={assignment.attachmentName || `Lampiran tugas ${assignment.title}`} className="mx-auto max-h-[72vh] max-w-full rounded-lg object-contain" />
              ) : canPreviewPdf ? (
                <iframe src={assignment.attachmentUrl} title={`Pratinjau ${assignment.attachmentName || 'lampiran tugas'}`} className="h-[72vh] w-full rounded-lg border border-slate-200 bg-white" />
              ) : (
                <p className="mx-auto max-w-xl rounded-lg bg-white p-5 text-center text-sm text-slate-600">
                  Pratinjau langsung belum tersedia untuk format ini. Anda tetap dapat mengunduh lampiran untuk membukanya.
                </p>
              )}
            </div>
            <footer className="flex justify-end border-t border-slate-200 px-4 py-3">
              <a href={assignment.attachmentUrl} download={assignment.attachmentName || true} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800">
                <Download size={14} aria-hidden="true" /> Unduh lampiran
              </a>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};
