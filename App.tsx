import React, { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { ProcessingStatus, Screenshot, VideoMetadata } from './types';
import { extractFrames, extractSpecificFrame, loadVideo } from './utils/videoUtils';
import VideoUploader from './components/VideoUploader';
import SettingsControls from './components/SettingsControls';
import Gallery from './components/Gallery';

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
  
  // App Mode State
  const [mode, setMode] = useState<AppMode>('batch');

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
    setErrorMsg(null);
    setStatus(ProcessingStatus.IDLE);
  };

  const handleProcess = async () => {
    if (!file) return;

    setStatus(ProcessingStatus.EXTRACTING);
    setProgress(0);
    setScreenshots([]);
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
        // We use duration - 0.1s to ensure we get a valid frame and not the black end
        const targetTime = Math.max(0, video.duration - 0.1); 
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

  const handleRemoveScreenshot = useCallback((id: string) => {
    setScreenshots(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleReset = () => {
    setFile(null);
    setMetadata(null);
    setScreenshots([]);
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg(null);
    setProgress(0);
  };

  const isProcessing = status === ProcessingStatus.EXTRACTING || status === ProcessingStatus.ZIPPING || status === ProcessingStatus.LOADING_VIDEO;

  return (
    <div className="h-screen flex flex-col bg-[#050508] text-gray-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      
      {/* Navbar */}
      <nav className="flex-shrink-0 border-b border-gray-800/80 bg-[#030304] z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              {/* App Icon: Aperture / Shutter */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                 <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full"></div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="14.31" y1="8" x2="20.05" y2="17.94"/>
                    <line x1="9.69" y1="8" x2="21.17" y2="8"/>
                    <line x1="7.38" y1="12" x2="13.12" y2="2.06"/>
                    <line x1="9.69" y1="16" x2="3.95" y2="6.06"/>
                    <line x1="14.31" y1="16" x2="2.83" y2="16"/>
                    <line x1="16.62" y1="12" x2="10.88" y2="21.94"/>
                  </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Frame<span className="text-indigo-400">Scout</span>
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area - Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT PANEL: Settings & Controls */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800 bg-[#08080a] z-10">
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            
            <div className="mb-6 mt-1">
              <h1 className="text-xl font-bold text-white mb-1">
                Extraction Studio
              </h1>
              <p className="text-gray-500 text-xs">
                Configure settings to capture the perfect frames.
              </p>
            </div>

            {/* Mode Tab Switcher */}
            <div className="flex p-1 bg-gray-900 rounded-lg mb-6 border border-gray-800">
              <button
                onClick={() => !isProcessing && handleModeChange('batch')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
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

            {/* Error Banner */}
            {errorMsg && (
              <div className="bg-red-900/10 border border-red-900/30 text-red-300 px-4 py-3 rounded-lg mb-5 flex items-center gap-3 text-sm animate-in fade-in duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errorMsg}
              </div>
            )}

            <div className="space-y-5">
              {!file ? (
                <VideoUploader onFileSelect={handleFileSelect} disabled={false} />
              ) : (
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="bg-gray-800 p-2 rounded-lg flex-shrink-0 border border-gray-700/50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="23 7 16 12 23 17 23 7"></polygon>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-200 truncate text-xs">{file.name}</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB • {metadata ? `${Math.floor(metadata.duration / 60)}:${Math.floor(metadata.duration % 60).toString().padStart(2, '0')}` : '...'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={handleReset}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1.5 hover:bg-gray-800 rounded-md"
                      title="Remove Video"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <div className="w-full bg-gray-800 rounded-full h-1 mb-4 overflow-hidden">
                    <div className="bg-indigo-500 h-1 rounded-full" style={{width: '100%'}}></div>
                  </div>

                  <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className={`
                      w-full py-2.5 rounded-lg font-semibold text-sm shadow-lg shadow-indigo-500/10
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

          {/* Sticky Footer: Download Action */}
          {screenshots.length > 0 && (
            <div className="flex-shrink-0 p-4 border-t border-gray-800 bg-[#08080a]/90 backdrop-blur-md z-20">
               <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-white font-medium text-sm truncate">
                       {mode === 'batch' ? 'Session Complete' : 'Frame Captured'}
                    </h3>
                    <p className="text-gray-500 text-xs truncate">{screenshots.length} image{screenshots.length !== 1 && 's'} ready</p>
                  </div>
                  <button
                    onClick={handleDownload}
                    disabled={status === ProcessingStatus.ZIPPING}
                    className="flex-shrink-0 bg-white text-gray-900 hover:bg-gray-100 font-semibold px-4 py-2 rounded-lg shadow-lg transition-all flex items-center gap-2 text-xs"
                  >
                    {status === ProcessingStatus.ZIPPING ? (
                      <span className="animate-pulse">Archiving...</span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {screenshots.length === 1 ? 'Download Image' : 'Download ZIP'}
                      </>
                    )}
                  </button>
               </div>
            </div>
          )}
        </aside>

        {/* RIGHT PANEL: Gallery (Primary Scroll) */}
        <main className="flex-1 overflow-y-auto bg-[#030304] p-6 lg:p-8 custom-scrollbar relative">
          <div className="max-w-7xl mx-auto h-full">
            {screenshots.length > 0 ? (
               <Gallery screenshots={screenshots} onRemove={handleRemoveScreenshot} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-800/50 rounded-2xl bg-gray-900/10">
                <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mb-4 border border-gray-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">Waiting for content</p>
                <p className="text-xs text-gray-600 mt-1">
                  {mode === 'batch' ? 'Import a video to begin batch extraction' : 'Import a video to capture the last frame'}
                </p>
              </div>
            )}
          </div>
        </main>

      </div>
    </div>
  );
}

export default App;