import { useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoGalleryProps {
  photos: string[];
  label?: string;
}

export default function PhotoGallery({ photos, label = 'Check-in Photos' }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // No photos — show placeholder
  if (photos.length === 0) {
    return (
      <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center gap-2">
        <Camera size={32} className="text-gray-400" />
        <p className="text-sm font-bold text-gray-400">No photos taken</p>
      </div>
    );
  }

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % photos.length);
    }
  };

  const goPrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
    }
  };

  return (
    <>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">📸</span>
        <h4 className="text-sm font-bold text-black uppercase tracking-wider">{label}</h4>
        <span className="text-xs text-black/50 font-medium ml-auto">Tap to zoom</span>
      </div>

      {/* Single photo — show large */}
      {photos.length === 1 && (
        <button
          onClick={() => openLightbox(0)}
          className="w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-200 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <img
            src={photos[0]}
            alt="Check-in photo"
            className="w-full h-full object-cover"
            loading="lazy"
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-100');
            }}
          />
        </button>
      )}

      {/* Multiple photos — hero + thumbnails */}
      {photos.length > 1 && (
        <div className="space-y-2">
          {/* Hero image (first photo) */}
          <button
            onClick={() => openLightbox(0)}
            className="w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-200 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <img
              src={photos[0]}
              alt="Check-in photo 1"
              className="w-full h-full object-cover"
              loading="lazy"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-100');
              }}
            />
          </button>

          {/* Thumbnail strip for remaining photos */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.slice(1).map((url, i) => (
              <button
                key={i}
                onClick={() => openLightbox(i + 1)}
                className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 border-gray-200 cursor-pointer active:scale-95 transition-transform"
              >
                <img
                  src={url}
                  alt={`Photo ${i + 2}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-100');
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black flex flex-col"
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <span className="text-white text-sm font-bold">
              {lightboxIndex + 1} / {photos.length}
            </span>
            <button
              onClick={closeLightbox}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-4 min-h-0">
            <img
              src={photos[lightboxIndex]}
              alt={`Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Navigation arrows (only for multiple photos) */}
          {photos.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); goPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/20 text-white cursor-pointer active:bg-white/30"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); goNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/20 text-white cursor-pointer active:bg-white/30"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          {/* Thumbnail dots */}
          {photos.length > 1 && (
            <div className="flex justify-center gap-2 pb-6 pt-3 shrink-0">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                    i === lightboxIndex ? 'bg-white scale-125' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
