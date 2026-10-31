import React, { useState, useEffect } from 'react';
import { Screenshot } from '../types';
import { formatTime } from '../utils/videoUtils';
import saveAs from 'file-saver';

interface GalleryProps {
  screenshots: Screenshot[];
  onRemove: (id: string) => void;
  isBatchMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onOpenStitchModal?: () => void;
}

const convertUrlToPngBlob = (url: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create PNG blob'));
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load image for copying'));
    img.src = url;
  });
};

const Gallery: React.FC<GalleryProps> = ({
  screenshots,
  onRemove,
  isBatchMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onOpenStitchModal,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  // Preview thumbnail size state: 'normal' (current default) vs 'small' (compact for narrow screen)
  const [thumbnailSize, setThumbnailSize] = useState<'normal' | 'small'>(() => {
    try {
      const saved = localStorage.getItem('fs_thumbnail_size');
      if (saved === 'small' || saved === 'normal') return saved;
    } catch (e) {
      // ignore
    }
    return 'normal';
  });

  useEffect(() => {
    try {
      localStorage.setItem('fs_thumbnail_size', thumbnailSize);
    } catch (e) {
      // ignore
    }
  }, [thumbnailSize]);

  if (screenshots.length === 0) return null;

  const totalSelected = selectedIds.size;
  const allSelected = screenshots.length > 0 && totalSelected === screenshots.length;
  const hasSelection = totalSelected > 0;
  const isSmall = thumbnailSize === 'small';

  const handleCopyFrame = async (shot: Screenshot) => {
    if (copyingId === shot.id) return;
    setCopyingId(shot.id);
    try {
      const pngBlob = await convertUrlToPngBlob(shot.url);
      const item = new ClipboardItem({ 'image/png': pngBlob });
      await navigator.clipboard.write([item]);
      setCopiedId(shot.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === shot.id ? null : prev));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy frame to clipboard:', err);
    } finally {
      setCopyingId((prev) => (prev === shot.id ? null : prev));
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-800/80">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Extracted Frames</h3>
          <span className="text-xs font-mono font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {screenshots.length}
          </span>
          {isBatchMode && hasSelection && (
            <span className="text-xs font-mono font-medium text-indigo-300 bg-indigo-600/20 px-2.5 py-0.5 rounded border border-indigo-500/30">
              {totalSelected} selected
            </span>
          )}
        </div>

        {/* Right side controls: Size Switcher + Batch Actions */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Thumbnail Size Toggle (Normal vs Small) */}
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5 text-xs text-gray-400">
            <button
              type="button"
              onClick={() => setThumbnailSize('normal')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                thumbnailSize === 'normal'
                  ? 'bg-gray-800 text-white font-medium shadow-xs'
                  : 'hover:text-gray-300'
              }`}
              title="Standard preview size"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span className="text-[11px]">Normal</span>
            </button>
            <button
              type="button"
              onClick={() => setThumbnailSize('small')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                thumbnailSize === 'small'
                  ? 'bg-gray-800 text-white font-medium shadow-xs'
                  : 'hover:text-gray-300'
              }`}
              title="Compact / small preview size"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="4" height="4"></rect>
                <rect x="10" y="3" width="4" height="4"></rect>
                <rect x="17" y="3" width="4" height="4"></rect>
                <rect x="3" y="10" width="4" height="4"></rect>
                <rect x="10" y="10" width="4" height="4"></rect>
                <rect x="17" y="10" width="4" height="4"></rect>
                <rect x="3" y="17" width="4" height="4"></rect>
                <rect x="10" y="17" width="4" height="4"></rect>
                <rect x="17" y="17" width="4" height="4"></rect>
              </svg>
              <span className="text-[11px]">Small</span>
            </button>
          </div>

          {/* Batch mode selective actions */}
          {isBatchMode && screenshots.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={allSelected ? onDeselectAll : onSelectAll}
                className="text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/80 hover:bg-gray-800 text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                  allSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-600 bg-black/40'
                }`}>
                  {allSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
              </button>

              {hasSelection && (
                <button
                  onClick={onOpenStitchModal}
                  className="text-xs px-3 sm:px-3.5 py-1.5 rounded-lg font-semibold border border-indigo-500 bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Stitch ({totalSelected})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Grid of Frames (Adapts based on normal vs small mode) */}
      <div 
        className={
          isSmall
            ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-2.5"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
        }
      >
        {screenshots.map((shot, idx) => {
          const isSelected = selectedIds.has(shot.id);
          const isCopied = copiedId === shot.id;
          const isCopying = copyingId === shot.id;

          return (
            <div 
              key={shot.id} 
              onClick={() => isBatchMode && onToggleSelect && onToggleSelect(shot.id)}
              className={`group relative bg-gray-900 rounded-lg overflow-hidden border transition-all duration-150 shadow-sm ${
                isBatchMode ? 'cursor-pointer' : ''
              } ${
                isSelected 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-indigo-500/10' 
                  : 'border-gray-800 hover:border-gray-600'
              }`}
            >
              {/* Aspect Square Container */}
              <div className="aspect-square w-full relative bg-[#000000]">
                {/* Image */}
                <img 
                  src={shot.url} 
                  alt={`Frame at ${shot.timestamp}`} 
                  className="w-full h-full object-contain"
                />

                {/* Checkbox (Batch Mode only) */}
                {isBatchMode && onToggleSelect && (
                  <div 
                    className={`absolute ${isSmall ? 'top-1.5 left-1.5' : 'top-2 left-2'} z-10`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(shot.id);
                    }}
                  >
                    <div className={`${isSmall ? 'w-4 h-4' : 'w-5 h-5'} rounded border flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' 
                        : 'bg-black/60 border-white/30 text-transparent hover:border-white group-hover:scale-105 backdrop-blur-sm'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={isSmall ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Sequence index */}
                <div className={`absolute ${isSmall ? 'top-1.5 right-1.5' : 'top-2 right-2'} pointer-events-none`}>
                  <span className={`${isSmall ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'} font-mono text-gray-400 bg-black/60 backdrop-blur-sm rounded border border-white/10`}>
                    #{idx + 1}
                  </span>
                </div>

                {/* Copied Toast Badge */}
                {isCopied && (
                  <div className={`absolute ${isSmall ? 'bottom-1.5 left-1.5' : 'bottom-2 left-2'} z-20 pointer-events-none animate-in fade-in duration-150`}>
                    <span className={`${isSmall ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'} font-medium text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 rounded shadow-md flex items-center gap-1`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </span>
                  </div>
                )}

                {/* Frame Timestamp Badge */}
                <div className={`absolute ${isSmall ? 'bottom-1.5 right-1.5' : 'bottom-2 right-2'} pointer-events-none`}>
                  <span className={`${isSmall ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'} font-mono font-medium text-indigo-100 bg-black/60 backdrop-blur-sm rounded border border-white/10 shadow-sm`}>
                    {formatTime(shot.timestamp)}
                  </span>
                </div>

                {/* Hover Actions Overlay */}
                <div 
                  className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${isSmall ? 'gap-1' : 'gap-2'} backdrop-blur-[2px]`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => window.open(shot.url, '_blank')}
                    className={`${isSmall ? 'p-1.5' : 'p-2'} bg-gray-700/80 rounded-full hover:bg-indigo-600 text-white transition-all transform hover:scale-110 shadow-lg`}
                    title="View Full Size"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={isSmall ? "h-3 w-3" : "h-4 w-4"} viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  <button 
                    onClick={() => handleCopyFrame(shot)}
                    disabled={isCopying}
                    className={`${isSmall ? 'p-1.5' : 'p-2'} rounded-full text-white transition-all transform hover:scale-110 shadow-lg ${
                      isCopied
                        ? 'bg-emerald-600'
                        : 'bg-gray-700/80 hover:bg-indigo-500'
                    }`}
                    title={isCopied ? 'Copied to Clipboard!' : 'Copy Image to Clipboard'}
                  >
                    {isCopied ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className={isSmall ? "h-3 w-3" : "h-4 w-4"} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className={isSmall ? "h-3 w-3" : "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    )}
                  </button>

                  <button 
                    onClick={() => saveAs(shot.blob, shot.fileName)}
                    className={`${isSmall ? 'p-1.5' : 'p-2'} bg-gray-700/80 rounded-full hover:bg-emerald-600 text-white transition-all transform hover:scale-110 shadow-lg`}
                    title="Download Image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={isSmall ? "h-3 w-3" : "h-4 w-4"} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  <button 
                    onClick={() => onRemove(shot.id)}
                    className={`${isSmall ? 'p-1.5' : 'p-2'} bg-gray-700/80 rounded-full hover:bg-red-500 text-white transition-all transform hover:scale-110 shadow-lg`}
                    title="Remove Frame"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={isSmall ? "h-3 w-3" : "h-4 w-4"} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Gallery;
