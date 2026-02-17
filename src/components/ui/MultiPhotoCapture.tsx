import { useRef, useState } from 'react';
import { Camera, Upload, X, Plus } from 'lucide-react';

interface MultiPhotoCaptureProps {
  maxPhotos?: number;
  onPhotosChange: (files: File[]) => void;
  existingUrls?: string[];
  disabled?: boolean;
}

export default function MultiPhotoCapture({
  maxPhotos = 5,
  onPhotosChange,
  existingUrls = [],
  disabled,
}: MultiPhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  const totalPhotos = existingUrls.length + files.length;
  const canAdd = totalPhotos < maxPhotos;

  const handleFile = (file: File) => {
    if (!canAdd) return;
    const url = URL.createObjectURL(file);
    const newFiles = [...files, file];
    const newPreviews = [...previews, url];
    setFiles(newFiles);
    setPreviews(newPreviews);
    onPhotosChange(newFiles);
    setShowOptions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    // Support multi-select from gallery
    for (let i = 0; i < fileList.length && (existingUrls.length + files.length + i) < maxPhotos; i++) {
      const file = fileList[i];
      const url = URL.createObjectURL(file);
      files.push(file);
      previews.push(url);
    }
    setFiles([...files]);
    setPreviews([...previews]);
    onPhotosChange([...files]);
    setShowOptions(false);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    onPhotosChange(newFiles);
  };

  const openOptions = () => {
    if (disabled || !canAdd) return;
    setShowOptions(true);
  };

  return (
    <>
      <div className="space-y-2">
        {/* Photo grid */}
        <div className="flex flex-wrap gap-2">
          {/* Existing photos (from DB/storage) */}
          {existingUrls.map((url, i) => (
            <div key={`existing-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-green-success">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}

          {/* New photos (local previews) */}
          {previews.map((url, i) => (
            <div key={`new-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-primary">
              <img src={url} alt={`New photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-urgent text-white rounded-full flex items-center justify-center cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Add button */}
          {canAdd && (
            <button
              type="button"
              onClick={openOptions}
              disabled={disabled}
              className={`w-20 h-20 rounded-xl border-2 border-dashed border-grey-border flex flex-col items-center justify-center gap-1 transition-colors
                ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-grey-bg hover:border-blue-primary'}`}
            >
              <Plus size={20} className="text-grey-muted" />
              <span className="text-[10px] text-grey-muted font-semibold">{totalPhotos}/{maxPhotos}</span>
            </button>
          )}
        </div>

        {totalPhotos === 0 && (
          <button
            type="button"
            onClick={openOptions}
            disabled={disabled}
            className={`w-full h-20 rounded-xl border-2 border-dashed border-grey-border flex items-center justify-center gap-2 transition-colors
              ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-grey-bg'}`}
          >
            <Camera size={20} className="text-grey-muted" />
            <span className="text-sm text-grey-muted font-semibold">Tap to add photos (max {maxPhotos})</span>
          </button>
        )}
      </div>

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
        multiple
        onChange={handleChange}
        className="hidden"
      />

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
