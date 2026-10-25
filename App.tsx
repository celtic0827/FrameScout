import React, { useState, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { ProcessingStatus, Screenshot, VideoMetadata } from './types';
import { extractFrames, extractSpecificFrame, loadVideo, mergeImagesToStrip } from './utils/videoUtils';
import VideoUploader from './components/VideoUploader';
import SettingsControls from './components/SettingsControls';
import Gallery from './components/Gallery';
import StitchModal from './components/StitchModal';

// Helper to load settings from LocalStorage
const getSavedSetting = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to parse setting', key, e);
  }
  return defaultValue;
};

type AppMode = 'batch' | 'last-frame';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [progress, setProgress] = useState<number>(0);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  // App Mode State
  const [mode, setMode] = useState<AppMode>('batch');

  // Independent Selection State for Stitch Feature (Default: empty / 不要預設全選)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isStitchModalOpen, setIsStitchModalOpen] = useState<boolean>(false);

  // Settings with LocalStorage persistence initialization
  const [count, setCount] = useState<number>(() => getSavedSetting('fs_count', 12));
  const [randomize, setRandomize] = useState<boolean>(() => getSavedSetting('fs_randomize', false));
  const [scale, setScale] = useState<number>(() => getSavedSetting('fs_scale', 100));

  // Persist settings whenever they change
  useEffect(() => {
    localStorage.setItem('fs_count', JSON.stringify(count));
    localStorage.setItem('fs_randomize', JSON.stringify(randomize));
    localStorage.setItem('fs_scale', JSON.stringify(scale));
  }, [count, randomize, scale]);

  // Clean up object URLs when components unmount or screenshots change
  useEffect(() => {
    return () => {
      screenshots.forEach(s => URL.revokeObjectURL(s.url));
    };
  }, [screenshots]);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setStatus(ProcessingStatus.LOADING_VIDEO);
    setErrorMsg(null);
    setScreenshots([]);
    setSelectedIds(new Set());
    
    try {
      const { metadata } = await loadVideo(selectedFile);
      setMetadata(metadata);
      setStatus(ProcessingStatus.IDLE);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load video. Please try another file.');
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleModeChange = (newMode: AppMode) => {
    if (mode === newMode) return;
    setMode(newMode);
    setScreenshots([]); // Clear results on mode switch to avoid confusion
    setSelectedIds(new Set());
    setErrorMsg(null);
    setStatus(ProcessingStatus.IDLE);
  };

  const handleProcess = async () => {
    if (!file) return;

    setStatus(ProcessingStatus.EXTRACTING);
    setProgress(0);
    setScreenshots([]);
    setSelectedIds(new Set()); // 不要預設全選，重設為空
    setErrorMsg(null);

    try {
      // Re-load video element specifically for extraction to ensure fresh state
      const { video } = await loadVideo(file);
      
      if (mode === 'batch') {
        const frames = await extractFrames(video, count, randomize, scale, (pct) => {
          setProgress(pct);
        });
        setScreenshots(frames);
      } else {
        // Last Frame Mode
        const targetTime = Math.max(0, video.duration - 0.015); 
        const frame = await extractSpecificFrame(video, targetTime, scale);
        setProgress(100);
        if (frame) {
          setScreenshots([frame]);
        } else {
          setErrorMsg("Could not extract the last frame.");
        }
      }
      
      setStatus(ProcessingStatus.COMPLETED);
      
      // Cleanup the video element source
      URL.revokeObjectURL(video.src);
      video.remove();

    } catch (err) {
      console.error(err);
      setErrorMsg('Error during frame extraction.');
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleDownload = async () => {
    if (screenshots.length === 0) return;

    // Direct download if only one image
    if (screenshots.length === 1) {
      const shot = screenshots[0];
      saveAs(shot.blob, shot.fileName);
      return;
    }

    // ZIP download if multiple images
    setStatus(ProcessingStatus.ZIPPING);
    const zip = new JSZip();
    
    screenshots.forEach((shot) => {
      zip.file(shot.fileName, shot.blob);
    });

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const suffix = mode === 'batch' ? 'previews' : 'last_frame';
      const zipName = metadata ? `${metadata.filename.split('.')[0]}_${suffix}.zip` : `frame_scout_${suffix}.zip`;
      saveAs(content, zipName);
      setStatus(ProcessingStatus.COMPLETED);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to create zip file.');
      setStatus(ProcessingStatus.ERROR);
    }
  };

  // Original Merge Strip: merges screenshots directly without interfering
  const handleMergeDownload = async () => {
    if (screenshots.length < 2) return;

    setStatus(ProcessingStatus.MERGING);
    try {
      const blob = await mergeImagesToStrip(screenshots);
      if (blob) {
        const name = metadata ? `${metadata.filename.split('.')[0]}_strip.jpg` : `frame_scout_strip.jpg`;
        saveAs(blob, name);
        setStatus(ProcessingStatus.COMPLETED);
      } else {
        setErrorMsg('Failed to merge images.');
        setStatus(ProcessingStatus.ERROR);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error during image merging.');
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleMergeCopy = async () => {
    if (screenshots.length < 2) return;

    setStatus(ProcessingStatus.MERGING);
    try {
      const blob = await mergeImagesToStrip(screenshots, 'image/png');
      if (blob) {
        try {
          const item = new ClipboardItem({ [blob.type]: blob });
          await navigator.clipboard.write([item]);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
          setStatus(ProcessingStatus.COMPLETED);
        } catch (clipErr) {
          console.error('Clipboard error:', clipErr);
          setErrorMsg('Failed to copy to clipboard. This browser may not support copying images.');
          setStatus(ProcessingStatus.ERROR);
        }
      } else {
        setErrorMsg('Failed to merge images.');
        setStatus(ProcessingStatus.ERROR);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error during image merging.');
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(screenshots.map(s => s.id)));
  }, [screenshots]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleRemoveScreenshot = useCallback((id: string) => {
    setScreenshots(prev => prev.filter(s => s.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleReset = () => {
    setFile(null);
    setMetadata(null);
    setScreenshots([]);
    setSelectedIds(new Set());
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg(null);
    setProgress(0);
  };

  const isProcessing = status === ProcessingStatus.EXTRACTING || status === ProcessingStatus.ZIPPING || status === ProcessingStatus.LOADING_VIDEO;

  // Selected screenshots for stitching modal
  const selectedScreenshotsList = useMemo(() => {
    return screenshots.filter(s => selectedIds.has(s.id));
  }, [screenshots, selectedIds]);

  const filePrefix = metadata ? metadata.filename.split('.')[0] : 'frame_scout';

  return (
    <div className="h-screen flex flex-col bg-[#050508] text-gray-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      
      {/* Navbar */}
      <nav className="flex-shrink-0 border-b border-gray-800/80 bg-[#030304] z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13 sm:h-14">
            <div className="flex items-center gap-3">
              <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
                 <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full"></div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="14.31" y1="8" x2="20.05" y2="17.94"/>
                    <line x1="9.69" y1="8" x2="21.17" y2="8"/>
                    <line x1="7.38" y1="12" x2="13.12" y2="2.06"/>
                    <line x1="9.69" y1="16" x2="3.95" y2="6.06"/>
                    <line x1="14.31" y1="16" x2="2.83" y2="16"/>
                    <line x1="16.62" y1="12" x2="10.88" y2="21.94"/>
                  </svg>
              </div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white">
                Frame<span className="text-indigo-400">Scout</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              {metadata && (
                <div className="flex items-center gap-2 font-mono bg-gray-900/60 px-2.5 py-1 rounded-md border border-gray-800">
                  <span>{metadata.width}×{metadata.height}</span>
                  <span className="text-gray-600">/</span>
                  <span>{metadata.duration.toFixed(1)}s</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area - Split View (Responsive: Top Ribbon on <lg, Left Sidebar on lg:) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* TOP RIBBON (<lg) / LEFT SIDEBAR (lg:): Settings & Controls */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800 bg-[#08080a] z-10 max-h-[46vh] lg:max-h-full">
          
          {/* Scrollable Content inside Ribbon / Sidebar */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-4 lg:p-5">
            
            {/* Title - Visible on desktop, streamlined on narrow screens */}
            <div className="mb-3 lg:mb-6 mt-0.5 hidden lg:block">
              <h1 className="text-xl font-bold text-white mb-1">
                Extraction Studio
              </h1>
              <p className="text-gray-500 text-xs">
                Configure settings to capture the perfect frames.
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="bg-red-900/10 border border-red-900/30 text-red-300 px-3 py-2 rounded-lg mb-3 flex items-center gap-2 text-xs animate-in fade-in duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errorMsg}
              </div>
            )}

            {/* Narrow layout ribbon container */}
            <div className="flex flex-col gap-3 lg:space-y-5">

              {/* Top row in narrow screen: Mode switcher + Video Status */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 sm:items-center lg:items-stretch">
                {/* Mode Tab Switcher */}
                <div className="flex p-1 bg-gray-900 rounded-lg border border-gray-800 w-full sm:w-64 lg:w-full flex-shrink-0">
                  <button
                    onClick={() => !isProcessing && handleModeChange('batch')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      mode === 'batch' 
                        ? 'bg-gray-800 text-white shadow-sm ring-1 ring-gray-700' 
                        : 'text-gray-500 hover:text-gray-300'
                    } ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
                    disabled={isProcessing}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                    Batch Extract
                  </button>
                  <button
                    onClick={() => !isProcessing && handleModeChange('last-frame')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      mode === 'last-frame' 
                        ? 'bg-gray-800 text-white shadow-sm ring-1 ring-gray-700' 
                        : 'text-gray-500 hover:text-gray-300'
                    } ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
                    disabled={isProcessing}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 12-7-7v14z"/><path d="M3 5v14"/><path d="M7 5v14"/></svg>
                    Last Frame
                  </button>
                </div>

                {/* Video Info badge if loaded (compact in ribbon) */}
                {file && (
                  <div className="flex-1 min-w-0 flex items-center justify-between sm:justify-end lg:justify-between bg-gray-900/40 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs">
                    <span className="text-gray-300 truncate max-w-[200px] sm:max-w-[260px] lg:max-w-none">{file.name}</span>
                    <button
                      onClick={handleReset}
                      className="text-gray-500 hover:text-red-400 p-1 ml-2 transition-colors"
                      title="Remove Video"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {!file ? (
                <VideoUploader onFileSelect={handleFileSelect} disabled={false} />
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                    <div className="bg-indigo-500 h-1 rounded-full" style={{width: '100%'}}></div>
                  </div>

                  <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className={`
                      w-full py-2 lg:py-2.5 rounded-lg font-semibold text-xs sm:text-sm shadow-md shadow-indigo-500/10
                      flex items-center justify-center gap-2
                      transition-all duration-200 transform active:scale-[0.98]
                      ${isProcessing 
                        ? 'bg-gray-800 text-gray-500 cursor-wait border border-gray-700' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 hover:border-indigo-400'
                      }
                    `}
                  >
                    {isProcessing ? (
                       <>
                         <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         {mode === 'batch' 
                           ? (status === ProcessingStatus.EXTRACTING ? `Extracting ${progress}%` : 'Processing...')
                           : 'Capturing...'
                         }
                       </>
                    ) : (
                      <>
                        {mode === 'batch' 
                          ? (screenshots.length > 0 ? 'Regenerate Previews' : 'Generate Previews')
                          : 'Capture Last Frame'
                        }
                      </>
                    )}
                  </button>
                </div>
              )}

              <SettingsControls 
                count={count} 
                setCount={setCount} 
                randomize={randomize}
                setRandomize={setRandomize}
                scale={scale}
                setScale={setScale}
                disabled={isProcessing}
                metadata={metadata}
                hideCount={mode === 'last-frame'}
                hideRandomize={mode === 'last-frame'}
              />
            </div>
          </div>

          {/* Desktop-only Sidebar Footer (lg: only) */}
          {screenshots.length > 0 && (
            <div className="hidden lg:block flex-shrink-0 p-4 border-t border-gray-800 bg-[#08080a]/90 backdrop-blur-md z-20">
               <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-white font-medium text-sm truncate">
                       {mode === 'batch' ? 'Session Complete' : 'Frame Captured'}
                    </h3>
                    <p className="text-gray-500 text-xs truncate">
                      {screenshots.length} image{screenshots.length !== 1 && 's'} ready
                      {mode === 'batch' && selectedIds.size > 0 && (
                        <span className="text-indigo-400 ml-1">· {selectedIds.size} selected</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {screenshots.length >= 2 && (
                      <>
                        <button
                          onClick={handleMergeCopy}
                          disabled={status === ProcessingStatus.MERGING || status === ProcessingStatus.ZIPPING}
                          className={`flex-shrink-0 font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs border disabled:opacity-50 ${
                            isCopied 
                              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                              : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20'
                          }`}
                        >
                          {status === ProcessingStatus.MERGING ? (
                            <span className="animate-pulse">Merging...</span>
                          ) : isCopied ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              Copy Strip
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleMergeDownload}
                          disabled={status === ProcessingStatus.MERGING || status === ProcessingStatus.ZIPPING}
                          className="flex-shrink-0 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
                        >
                          {status === ProcessingStatus.MERGING ? (
                            <span className="animate-pulse">Merging...</span>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="10" rx="2" />
                                <line x1="8" y1="7" x2="8" y2="17" />
                                <line x1="16" y1="7" x2="16" y2="17" />
                              </svg>
                              Merge Strip
                            </>
                          )}
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleDownload}
                      disabled={status === ProcessingStatus.ZIPPING || status === ProcessingStatus.MERGING}
                      className="flex-shrink-0 bg-white text-gray-900 hover:bg-gray-100 font-semibold px-3.5 py-1.5 rounded-lg shadow-lg transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
                    >
                      {status === ProcessingStatus.ZIPPING ? (
                        <span className="animate-pulse">Archiving...</span>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          {screenshots.length === 1 ? 'Download Image' : 'Download ZIP'}
                        </>
                      )}
                    </button>
                  </div>
               </div>
            </div>
          )}
        </aside>

        {/* BOTTOM PANEL: Gallery (Primary Viewport on narrow screens) */}
        <main className="flex-1 overflow-y-auto bg-[#030304] p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 custom-scrollbar relative">
          <div className="max-w-7xl mx-auto h-full">
            {screenshots.length > 0 ? (
               <Gallery 
                 screenshots={screenshots} 
                 onRemove={handleRemoveScreenshot}
                 isBatchMode={mode === 'batch'}
                 selectedIds={selectedIds}
                 onToggleSelect={handleToggleSelect}
                 onSelectAll={handleSelectAll}
                 onDeselectAll={handleDeselectAll}
                 onOpenStitchModal={() => setIsStitchModalOpen(true)}
               />
            ) : (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center border-2 border-dashed border-gray-800/50 rounded-2xl bg-gray-900/10 p-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-900 flex items-center justify-center mb-3 sm:mb-4 border border-gray-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 font-medium text-sm">Waiting for content</p>
                <p className="text-xs text-gray-600 mt-1 text-center">
                  {mode === 'batch' ? 'Import a video to begin batch extraction' : 'Import a video to capture the last frame'}
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Unified Bottom Sticky Bar for Narrow Screens (<lg only) */}
        {screenshots.length > 0 && (
          <div className="lg:hidden absolute bottom-0 left-0 right-0 p-3 border-t border-gray-800 bg-[#08080a]/95 backdrop-blur-md z-30 shadow-2xl">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-baseline gap-1.5">
                <span className="text-white font-medium text-xs font-mono">{screenshots.length} imgs</span>
                {mode === 'batch' && selectedIds.size > 0 && (
                  <span className="text-indigo-400 text-[11px] font-mono">({selectedIds.size} sel)</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto custom-scrollbar py-0.5">
                {screenshots.length >= 2 && (
                  <>
                    <button
                      onClick={handleMergeCopy}
                      disabled={status === ProcessingStatus.MERGING || status === ProcessingStatus.ZIPPING}
                      className={`font-semibold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 text-xs border whitespace-nowrap disabled:opacity-50 ${
                        isCopied 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20'
                      }`}
                    >
                      {status === ProcessingStatus.MERGING ? (
                        <span className="animate-pulse">Merging...</span>
                      ) : isCopied ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                          Copy Strip
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleMergeDownload}
                      disabled={status === ProcessingStatus.MERGING || status === ProcessingStatus.ZIPPING}
                      className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 font-semibold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 text-xs whitespace-nowrap disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="10" rx="2" />
                        <line x1="8" y1="7" x2="8" y2="17" />
                        <line x1="16" y1="7" x2="16" y2="17" />
                      </svg>
                      Merge Strip
                    </button>
                  </>
                )}

                <button
                  onClick={handleDownload}
                  disabled={status === ProcessingStatus.ZIPPING || status === ProcessingStatus.MERGING}
                  className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-3 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs whitespace-nowrap disabled:opacity-50"
                >
                  {status === ProcessingStatus.ZIPPING ? (
                    <span className="animate-pulse">Archiving...</span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      {screenshots.length === 1 ? 'Download' : 'Download ZIP'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Frame Stitching Modal (Pure and isolated component) */}
      {isStitchModalOpen && (
        <StitchModal
          isOpen={isStitchModalOpen}
          onClose={() => setIsStitchModalOpen(false)}
          selectedScreenshots={selectedScreenshotsList}
          filenamePrefix={filePrefix}
        />
      )}
    </div>
  );
}

export default App;
