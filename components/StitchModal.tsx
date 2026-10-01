import React, { useState, useEffect } from 'react';
import { Screenshot } from '../types';
import { stitchFramesToGrid } from '../utils/stitchUtils';
import saveAs from 'file-saver';

interface StitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedScreenshots: Screenshot[];
  filenamePrefix: string;
}

const StitchModal: React.FC<StitchModalProps> = ({
  isOpen,
  onClose,
  selectedScreenshots,
  filenamePrefix,
}) => {
  const [rowCount, setRowCount] = useState<number>(1);
  const [gap, setGap] = useState<number>(8);
  const [backgroundColor, setBackgroundColor] = useState<string>('#09090b');
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');

  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const totalSelected = selectedScreenshots.length;
  const maxRows = Math.max(1, Math.min(8, totalSelected));
  const effectiveRows = Math.min(rowCount, totalSelected);
  const colsPerRow = Math.ceil(totalSelected / (effectiveRows || 1));

  // Reset or adjust row count if selected frames change
  useEffect(() => {
    if (rowCount > totalSelected && totalSelected > 0) {
      setRowCount(totalSelected);
    }
  }, [totalSelected, rowCount]);

  // Generate clean preview without timestamp whenever options change
  useEffect(() => {
    if (!isOpen || selectedScreenshots.length === 0) return;

    let isSubscribed = true;
    setIsGenerating(true);
    setCopyError(null);

    const timer = setTimeout(async () => {
      try {
        const blob = await stitchFramesToGrid(selectedScreenshots, {
          rowCount,
          gap,
          backgroundColor,
          format,
        });

        if (isSubscribed && blob) {
          setPreviewBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (err) {
        console.error('Failed to generate preview', err);
      } finally {
        if (isSubscribed) setIsGenerating(false);
      }
    }, 120);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [isOpen, selectedScreenshots, rowCount, gap, backgroundColor, format]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!previewBlob) return;
    const ext = format === 'image/png' ? 'png' : 'jpg';
    const name = `${filenamePrefix}_stitched_${rowCount}rows_${totalSelected}frames.${ext}`;
    saveAs(previewBlob, name);
  };

  const handleCopy = async () => {
    setCopyError(null);
    try {
      let blobToCopy = previewBlob;
      if (format !== 'image/png') {
        blobToCopy = await stitchFramesToGrid(selectedScreenshots, {
          rowCount,
          gap,
          backgroundColor,
          format: 'image/png',
        });
      }
      if (!blobToCopy) throw new Error('Could not create image');

      const item = new ClipboardItem({ 'image/png': blobToCopy });
      await navigator.clipboard.write([item]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy error:', err);
      setCopyError('Failed to copy. Your browser may restrict clipboard image writing.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0b0c10] border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/80 bg-[#07080a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Stitch Selected Frames</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Horizontal grid of {totalSelected} frame{totalSelected > 1 ? 's' : ''} · {colsPerRow} col{colsPerRow > 1 ? 's' : ''} × {effectiveRows} row{effectiveRows > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 hover:bg-gray-800/80 rounded-lg transition-colors"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Settings Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0 p-5 bg-[#090a0d] border-b lg:border-b-0 lg:border-r border-gray-800/80 overflow-y-auto custom-scrollbar space-y-5">
            
            {/* Row Count Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-gray-300">
                  Rows
                </label>
                <span className="text-xs font-mono font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  {rowCount} {rowCount === 1 ? 'Row (Single row)' : 'Rows'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max={maxRows}
                value={rowCount}
                onChange={(e) => setRowCount(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                <span>1 row ({totalSelected} cols)</span>
                {maxRows > 1 && <span>{maxRows} rows</span>}
              </div>
            </div>

            {/* Quick Row Buttons */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].filter(r => r <= totalSelected).map((r) => (
                <button
                  key={r}
                  onClick={() => setRowCount(r)}
                  className={`flex-1 py-1 text-xs font-medium rounded border transition-colors ${
                    rowCount === r
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:text-white'
                  }`}
                >
                  {r} {r === 1 ? 'Row' : 'Rows'}
                </button>
              ))}
            </div>

            {/* Spacing / Gap Slider */}
            <div className="pt-2 border-t border-gray-800/60">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-gray-300">
                  Spacing (Gap)
                </label>
                <span className="text-xs font-mono font-semibold text-gray-300 bg-gray-800 px-2 py-0.5 rounded">
                  {gap}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="32"
                step="2"
                value={gap}
                onChange={(e) => setGap(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                <span>0px (Seamless)</span>
                <span>32px</span>
              </div>
            </div>

            {/* Background Color */}
            <div className="pt-2 border-t border-gray-800/60">
              <label className="text-xs font-semibold text-gray-300 block mb-2">Background</label>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Dark', value: '#09090b' },
                  { label: 'Black', value: '#000000' },
                  { label: 'Slate', value: '#1e293b' },
                  { label: 'White', value: '#ffffff' },
                ].map((bg) => (
                  <button
                    key={bg.value}
                    onClick={() => setBackgroundColor(bg.value)}
                    className={`flex-1 py-1 text-xs rounded border flex items-center justify-center gap-1.5 transition-colors ${
                      backgroundColor === bg.value
                        ? 'border-indigo-500 ring-1 ring-indigo-500 font-medium text-white'
                        : 'border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full border border-white/20" 
                      style={{ backgroundColor: bg.value }}
                    />
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div className="pt-2 border-t border-gray-800/60">
              <label className="text-xs font-semibold text-gray-300 block mb-2">Export Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormat('image/jpeg')}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    format === 'image/jpeg'
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                      : 'bg-gray-800/40 text-gray-400 border-gray-700 hover:text-white'
                  }`}
                >
                  JPG (Compact)
                </button>
                <button
                  onClick={() => setFormat('image/png')}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    format === 'image/png'
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                      : 'bg-gray-800/40 text-gray-400 border-gray-700 hover:text-white'
                  }`}
                >
                  PNG (Lossless)
                </button>
              </div>
            </div>

            {copyError && (
              <div className="text-[11px] text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded p-2">
                {copyError}
              </div>
            )}
          </div>

          {/* Interactive Preview Canvas */}
          <div className="flex-1 bg-[#050507] p-6 flex flex-col items-center justify-center overflow-auto relative">
            {isGenerating && (
              <div className="absolute top-4 right-4 z-10 bg-gray-900/90 border border-gray-700/80 px-3 py-1.5 rounded-full text-xs text-indigo-400 flex items-center gap-2 shadow-lg backdrop-blur">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Rendering preview...
              </div>
            )}

            {previewUrl ? (
              <div className="max-w-full max-h-full flex items-center justify-center p-2">
                <img
                  src={previewUrl}
                  alt="Stitched preview"
                  className="max-h-[60vh] max-w-full object-contain rounded-lg border border-gray-800 shadow-2xl transition-opacity duration-200"
                  style={{ opacity: isGenerating ? 0.6 : 1 }}
                />
              </div>
            ) : (
              <div className="text-gray-500 text-xs">Generating preview...</div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-800/80 bg-[#07080a] flex items-center justify-between">
          <div className="text-xs text-gray-500 font-mono">
            {colsPerRow} cols × {effectiveRows} rows · {totalSelected} frames
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleCopy}
              disabled={!previewBlob || isGenerating}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2 disabled:opacity-50 ${
                isCopied
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/30'
              }`}
            >
              {isCopied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy Image
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              disabled={!previewBlob || isGenerating}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Stitched Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StitchModal;
