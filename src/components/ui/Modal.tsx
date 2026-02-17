import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" style={{ animation: 'backdropFadeIn 0.2s ease-out' }} />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        <div className="w-12 h-1.5 bg-grey-border rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-4">
          {title ? <h3 className="text-lg font-bold">{title}</h3> : <span />}
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-grey-bg text-grey-muted hover:bg-grey-border transition-colors cursor-pointer shrink-0">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
