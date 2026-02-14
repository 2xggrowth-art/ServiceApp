export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 animate-slide-up"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        <div className="w-10 h-1 bg-grey-border rounded-full mx-auto mb-4" />
        {title && <h3 className="text-lg font-bold mb-4">{title}</h3>}
        {children}
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
