import React, { useRef, useEffect } from 'react';
import { VideoMetadata } from '../../types';
import { formatTimeWithMs } from './snapshotUtils';

interface VideoPreviewColProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoFile: File | null;
  videoSrc: string | null;
  metadata: VideoMetadata | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  isMuted: boolean;
  isShutterFlashing: boolean;
  onTogglePlay: () => void;
  onStep: (delta: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleMute: () => void;
  onCapture: () => void;
  onSelectFile?: (file: File) => void;
}

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoPreviewCol: React.FC<VideoPreviewColProps> = ({
  videoRef,
  videoFile,
  videoSrc,
  metadata,
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  isMuted,
  isShutterFlashing,
  onTogglePlay,
  onStep,
  onPlaybackRateChange,
  onToggleMute,
  onCapture,
  onSelectFile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync playback rate to video ref
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, videoRef]);

  // Sync muted to video ref
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, videoRef]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!videoFile || !videoSrc) {
    return (
      <div 
        className="h-full flex flex-col items-center justify-center p-6 bg-[#030304] text-center"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.files && e.dataTransfer.files[0] && onSelectFile) {
            onSelectFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="video/*" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0] && onSelectFile) {
              onSelectFile(e.target.files[0]);
            }
          }}
        />
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 rounded-2xl bg-gray-900/80 border border-gray-800 hover:border-indigo-500/50 flex flex-col items-center justify-center mb-4 text-gray-500 shadow-inner cursor-pointer hover:bg-gray-800/40 transition-all group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="m9 8 6 4-6 4Z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white mb-1">Load Video for Quick Snapshots</h3>
        <p className="text-xs text-gray-500 max-w-sm mb-4">
          Drop a video file here or click below to select a video from your computer.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Select Video File
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full flex flex-col bg-[#030304] overflow-hidden relative select-none"
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0] && onSelectFile) {
          onSelectFile(e.dataTransfer.files[0]);
        }
      }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="video/*" 
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && onSelectFile) {
            onSelectFile(e.target.files[0]);
          }
        }}
      />
      {/* Top HUD Overlay */}
      <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between border-b border-gray-800/60 bg-[#050508]/80 backdrop-blur-sm z-10 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-mono text-gray-200 font-semibold tabular-nums text-sm">
            {formatTimeWithMs(currentTime)}
          </span>
          <span className="text-gray-600 font-mono">/</span>
          <span className="font-mono text-gray-500 tabular-nums text-xs">
            {formatTimeWithMs(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {metadata && (
            <span className="font-mono text-[11px] text-gray-400 bg-gray-900/80 px-2 py-0.5 rounded border border-gray-800">
              {metadata.width} × {metadata.height}
            </span>
          )}
          <span className="text-gray-400 text-[11px] truncate max-w-[150px] hidden sm:inline" title={videoFile.name}>
            {videoFile.name}
          </span>
          {onSelectFile && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] px-2 py-0.5 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-colors flex items-center gap-1"
              title="Select another video"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Change</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-3 sm:p-4 bg-[#020203]">
        <div className="relative max-h-full max-w-full flex items-center justify-center rounded-xl overflow-hidden shadow-2xl border border-gray-800/80 bg-black group">
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            preload="auto"
            onClick={onTogglePlay}
            className="max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-260px)] w-auto max-w-full object-contain cursor-pointer"
          />

          {/* Shutter Flash Animation */}
          {isShutterFlashing && (
            <div className="absolute inset-0 bg-white/90 pointer-events-none animate-out fade-out duration-300 z-30" />
          )}

          {/* Center Play/Pause indicator on hover or click */}
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xl hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Center Control Bar: Primary Capture Button + Playback Controls */}
      <div className="flex-shrink-0 px-4 py-3 bg-[#08080a] border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-3 z-10">
        
        {/* Playback Controls (Left) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Step Back button */}
          <button
            type="button"
            onClick={() => onStep(-1)}
            title="Step Backward (Left Arrow)"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>

          {/* Play / Pause button */}
          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="p-2.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors border border-gray-700/60 shadow-sm"
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* Step Forward button */}
          <button
            type="button"
            onClick={() => onStep(1)}
            title="Step Forward (Right Arrow)"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>

          {/* Speed Selector */}
          <div className="relative inline-flex items-center ml-1">
            <select
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
              aria-label="Playback speed"
              className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer font-mono"
            >
              {PLAYBACK_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}x
                </option>
              ))}
            </select>
          </div>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors ml-1"
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>
        </div>

        {/* Big Prominent Capture Snapshot Button */}
        <button
          type="button"
          onClick={onCapture}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40 hover:border-indigo-300 transition-all duration-150 transform active:scale-95 group cursor-pointer"
        >
          <div className="p-1 rounded-md bg-white/20 text-white group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          </div>
          <span>Capture Snapshot</span>
          <div className="flex gap-1 items-center ml-1 opacity-80">
            <kbd className="px-1.5 py-0.5 rounded bg-black/30 border border-white/20 font-mono text-[10px]">S</kbd>
            <span className="text-[10px]">/</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/30 border border-white/20 font-mono text-[10px]">C</kbd>
          </div>
        </button>

      </div>
    </div>
  );
};

export default VideoPreviewCol;
