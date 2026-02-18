import { useRef, useState } from 'react';
import { Camera, Upload, X, Plus, Video } from 'lucide-react';

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
  const [warning, setWarning] = useState('');

  const totalPhotos = existingUrls.length + files.length;
  const canAdd = totalPhotos < maxPhotos;

  const isVideoFile = (file: File) => file.type.startsWith('video/');

  const handleFile = (file: File) => {
    if (!canAdd) return;
    const url = URL.createObjectURL(file);
    const newFiles = [...files, file];
    const newPreviews = [...previews, url];
    setFiles(newFiles);
    setPreviews(newPreviews);
    onPhotosChange(newFiles);
    setShowOptions(false);
    setWarning('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const remaining = maxPhotos - existingUrls.length - files.length;
    // Show warning if user selected more than allowed
    if (fileList.length > remaining) {
      setWarning(`Only ${remaining} more file${remaining !== 1 ? 's' : ''} allowed (max ${maxPhotos}). ${fileList.length - remaining} file${fileList.length - remaining !== 1 ? 's' : ''} skipped.`);
    } else {
      setWarning('');
    }
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
        {/* Gallery-style photo grid */}
        <div className={`grid gap-2.5 ${
          totalPhotos === 0 ? '' :
          totalPhotos <= 2 ? 'grid-cols-2' :
          'grid-cols-3'
        }`}>
          {/* Existing photos (from DB/storage) */}
          {existingUrls.map((url, i) => (
            <div key={`existing-${i}`} className="relative aspect-square rounded-2xl overflow-hidden ring-2 ring-green-success/30">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute bottom-1.5 left-1.5 bg-green-success/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">Saved</div>
            </div>
          ))}

          {/* New photos/videos (local previews) */}
          {previews.map((url, i) => (
            <div key={`new-${i}`} className="relative aspect-square rounded-2xl overflow-hidden ring-2 ring-blue-primary/25">
              {files[i] && isVideoFile(files[i]) ? (
                <>
                  <video src={url} className="w-full h-full object-cover" muted />
                  <div className="absolute bottom-1.5 left-1.5 bg-blue-primary/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-0.5">
                    <Video size={8} /> Video
                  </div>
                </>
              ) : (
                <img src={url} alt={`New photo ${i + 1}`} className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-urgent transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Add button tile */}
          {canAdd && totalPhotos > 0 && (
            <button
              type="button"
              onClick={openOptions}
              disabled={disabled}
              className={`aspect-square rounded-2xl border-2 border-dashed border-grey-border/80 flex flex-col items-center justify-center gap-1 transition-all
                ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-blue-light/30 hover:border-blue-primary/40 active:scale-[0.97]'}`}
            >
              <div className="w-8 h-8 rounded-xl bg-grey-bg flex items-center justify-center">
                <Plus size={16} className="text-grey-muted" />
              </div>
              <span className="text-[9px] text-grey-light font-semibold">{totalPhotos}/{maxPhotos}</span>
            </button>
          )}
        </div>

        {totalPhotos === 0 && (
          <button
            type="button"
            onClick={openOptions}
            disabled={disabled}
            className={`w-full rounded-2xl border-2 border-dashed border-grey-border/70 bg-grey-bg/30 flex flex-col items-center justify-center gap-2 py-7 transition-all
              ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-blue-light/20 hover:border-blue-primary/40 active:scale-[0.99]'}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
              <Camera size={22} className="text-grey-muted" />
            </div>
            <div className="text-center">
              <span className="text-[13px] text-grey-text font-semibold block">Add Photos / Videos</span>
              <span className="text-[10px] text-grey-light">Up to {maxPhotos} files</span>
            </div>
          </button>
        )}

        {/* Warning when user tries to select more than limit */}
        {warning && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl">
            <span className="text-[12px] text-orange-600 font-semibold">{warning}</span>
          </div>
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
        accept="image/*,video/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />

      {/* Options popup — refined bottom sheet */}
      {showOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowOptions(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.2s ease-out' }}
          >
            <div className="w-10 h-1 bg-grey-border rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-extrabold">Add Photo / Video</h3>
              <button
                onClick={() => setShowOptions(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-grey-bg text-grey-muted hover:bg-grey-border transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowOptions(false); setTimeout(() => cameraRef.current?.click(), 100); }}
                className="flex-1 flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 border-grey-border/80 bg-white hover:bg-blue-light/30 active:scale-[0.97] transition-all cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-primary/8 flex items-center justify-center text-blue-primary">
                  <Camera size={26} />
                </div>
                <span className="text-sm font-bold">Camera</span>
                <span className="text-[10px] text-grey-light">Take a photo</span>
              </button>
              <button
                onClick={() => { setShowOptions(false); setTimeout(() => uploadRef.current?.click(), 100); }}
                className="flex-1 flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 border-grey-border/80 bg-white hover:bg-green-light/30 active:scale-[0.97] transition-all cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-green-success/8 flex items-center justify-center text-green-success">
                  <Upload size={26} />
                </div>
                <span className="text-sm font-bold">Gallery</span>
                <span className="text-[10px] text-grey-light">Upload from files</span>
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
