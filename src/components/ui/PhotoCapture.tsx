import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';

interface PhotoCaptureProps {
  label: string;
  value?: string;           // existing photo URL
  onCapture: (file: File) => void;
  disabled?: boolean;
}

export default function PhotoCapture({ label, value, onCapture, disabled }: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [showOptions, setShowOptions] = useState(false);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    onCapture(file);
    setShowOptions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
  };

  const openOptions = () => {
    if (disabled) return;
    setShowOptions(true);
  };

  return (
    <>
      <div
        onClick={openOptions}
        className={`relative h-28 border-2 rounded-xl flex flex-col items-center justify-center overflow-hidden transition-colors
          ${preview ? 'border-green-success' : 'border-dashed border-grey-border'}
          ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-grey-bg'}`}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-lg">Tap to change</span>
            </div>
          </>
        ) : (
          <>
            <span className="text-3xl mb-1">📷</span>
            <span className="text-xs text-grey-muted font-semibold">{label}</span>
          </>
        )}

        {/* Hidden file inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="hidden"
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {/* Options popup */}
      {showOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowOptions(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.2s ease-out' }}
          >
            <div className="w-10 h-1 bg-grey-border rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">Add Photo</h3>
              <button
                onClick={() => setShowOptions(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-grey-bg text-grey-muted hover:bg-grey-border transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowOptions(false); setTimeout(() => cameraRef.current?.click(), 100); }}
                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-grey-border bg-white hover:bg-grey-bg active:scale-95 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-blue-primary/10 flex items-center justify-center text-blue-primary">
                  <Camera size={24} />
                </div>
                <span className="text-sm font-semibold">Camera</span>
                <span className="text-[10px] text-grey-muted">Take a photo</span>
              </button>
              <button
                onClick={() => { setShowOptions(false); setTimeout(() => uploadRef.current?.click(), 100); }}
                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-grey-border bg-white hover:bg-grey-bg active:scale-95 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-green-success/10 flex items-center justify-center text-green-success">
                  <Upload size={24} />
                </div>
                <span className="text-sm font-semibold">Gallery</span>
                <span className="text-[10px] text-grey-muted">Upload from files</span>
              </button>
            </div>
          </div>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
