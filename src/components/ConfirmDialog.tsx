import { useEffect, useRef } from 'react';

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="rise w-full max-w-sm rounded-[20px] border border-line bg-surface p-6 shadow-lift"
      >
        <h2 id="confirm-title" className="font-display text-[22px] text-ink">
          {request.title}
        </h2>
        <p id="confirm-body" className="mt-2 text-muted">
          {request.body}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Keep it
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="btn btn-destructive"
            onClick={() => {
              request.onConfirm();
              onClose();
            }}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
