import React, { useState } from 'react';
import { Screenshot } from '../../types';
import { SnapshotDensity } from './types';
import { formatTimeWithMs, copyBlobToClipboard } from './snapshotUtils';
import saveAs from 'file-saver';

interface SnapshotListColProps {
  snapshots: Screenshot[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSnapshot: (id: string) => void;
  onSeekToTimestamp: (time: number) => void;
  onOpenStitchModal: () => void;
  onDownloadAllZip: () => void;
  isZipping?: boolean;
}

const SnapshotListCol: React.FC<SnapshotListColProps> = ({
  snapshots,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onDeleteSnapshot,
  onSeekToTimestamp,
  onOpenStitchModal,
  onDownloadAllZip,
  isZipping = false
}) => {
  const [density, setDensity] = useState<SnapshotDensity>('normal');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalCount = snapshots.length;
  const selectedCount = selectedIds.size;
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;

  const handleCopySingle = async (e: React.MouseEvent, s: Screenshot) => {
    e.stopPropagation();
    const success = await copyBlobToClipboard(s.blob);
    if (success) {
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleDownloadSingle = (e: React.MouseEvent, s: Screenshot) => {
    e.stopPropagation();
    saveAs(s.blob, s.fileName);
  };

  const handleDeleteSingle = (e: React.MouseEvent, s: Screenshot) => {
    e.stopPropagation();
    onDeleteSnapshot(s.id);
  };

  return (
    <div className="h-full flex flex-col bg-[#08080a] border-l border-gray-800/80 overflow-hidden select-none">
      
      {/* Header */}
      <div className="p-3 border-b border-gray-800/80 bg-[#060608] space-y-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
              Snapshots
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono text-[11px] font-semibold border border-indigo-500/20">
              {totalCount}
            </span>
          </div>

          {/* Density / Grid Size Toggle */}
          <div className="flex items-center bg-gray-900/90 rounded-lg p-0.5 border border-gray-800 text-gray-400">
            <button
              type="button"
              onClick={() => setDensity('normal')}
              className={`p-1 rounded transition-colors ${
                density === 'normal' ? 'bg-gray-800 text-white shadow-sm' : 'hover:text-gray-200'
              }`}
              title="Standard Square Grid (2 Columns)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`p-1 rounded transition-colors ${
                density === 'compact' ? 'bg-gray-800 text-white shadow-sm' : 'hover:text-gray-200'
              }`}
              title="Compact Square Grid (3 Columns)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="4" height="4" rx="0.5" />
                <rect x="10" y="3" width="4" height="4" rx="0.5" />
                <rect x="17" y="3" width="4" height="4" rx="0.5" />
                <rect x="3" y="10" width="4" height="4" rx="0.5" />
                <rect x="10" y="10" width="4" height="4" rx="0.5" />
                <rect x="17" y="10" width="4" height="4" rx="0.5" />
                <rect x="3" y="17" width="4" height="4" rx="0.5" />
                <rect x="10" y="17" width="4" height="4" rx="0.5" />
                <rect x="17" y="17" width="4" height="4" rx="0.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Batch Action Toolbar */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between gap-1.5 pt-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={isAllSelected ? onDeselectAll : onSelectAll}
                className="text-gray-400 hover:text-gray-200 transition-colors font-medium"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
              {selectedCount > 0 && (
                <span className="text-indigo-400 font-mono">({selectedCount})</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {selectedCount >= 2 && (
                <button
                  type="button"
                  onClick={onOpenStitchModal}
                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                  </svg>
                  Stitch ({selectedCount})
                </button>
              )}

              <button
                type="button"
                onClick={onDownloadAllZip}
                disabled={isZipping}
                className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium border border-gray-700 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {isZipping ? (
                  <span className="animate-pulse">Zipping...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    ZIP
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Snapshot Square Grid / Array Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5">
        {totalCount === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
            </div>
            <p className="text-gray-300 font-medium text-xs mb-1">No Snapshots Yet</p>
            <p className="text-gray-500 text-[11px] leading-relaxed max-w-[200px]">
              Hit <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 font-mono text-[10px]">S</kbd> or click Capture while watching to save key frames.
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-2 ${
              density === 'compact' ? 'grid-cols-3' : 'grid-cols-2'
            }`}
          >
            {snapshots.map((s, index) => {
              const isSelected = selectedIds.has(s.id);
              const isCopied = copiedId === s.id;

              return (
                <div
                  key={s.id}
                  className={`group relative rounded-xl border overflow-hidden bg-gray-900/60 ${
                    isSelected
                      ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {/* Square Aspect Ratio Thumbnail Container (No hover scale animation) */}
                  <div
                    onClick={() => onSeekToTimestamp(s.timestamp)}
                    className="relative aspect-square w-full bg-black cursor-pointer overflow-hidden"
                    title={`#${index + 1} - ${formatTimeWithMs(s.timestamp)} (Click to seek)`}
                  >
                    <img
                      src={s.url}
                      alt={`Snapshot at ${formatTimeWithMs(s.timestamp)}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Top Left: Select Checkbox */}
                    <div
                      className="absolute top-1.5 left-1.5 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(s.id)}
                        className="h-3.5 w-3.5 rounded border-gray-700 bg-gray-950/90 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer shadow"
                      />
                    </div>

                    {/* Top Right: Index Pill */}
                    <div className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-black/75 backdrop-blur-sm text-gray-300 font-mono text-[9px] pointer-events-none border border-white/5">
                      #{index + 1}
                    </div>

                    {/* Bottom Left: Timestamp Badge */}
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-white font-mono text-[10px] font-medium border border-white/10 pointer-events-none tabular-nums">
                      {formatTimeWithMs(s.timestamp)}
                    </div>
                  </div>

                  {/* Action Bar Beneath Thumbnail */}
                  <div className="px-1.5 py-1 flex items-center justify-between border-t border-gray-800/80 bg-[#060608]">
                    {/* Copy to clipboard */}
                    <button
                      type="button"
                      onClick={(e) => handleCopySingle(e, s)}
                      className={`p-1 rounded text-xs transition-colors flex items-center gap-1 ${
                        isCopied
                          ? 'text-green-400 bg-green-500/10'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                      title={isCopied ? 'Copied!' : 'Copy image to clipboard'}
                    >
                      {isCopied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>

                    {/* Download single image */}
                    <button
                      type="button"
                      onClick={(e) => handleDownloadSingle(e, s)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                      title="Download image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>

                    {/* Delete snapshot */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSingle(e, s)}
                      className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      title="Delete snapshot"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default SnapshotListCol;
