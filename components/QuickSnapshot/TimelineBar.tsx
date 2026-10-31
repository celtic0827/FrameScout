import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Screenshot } from '../../types';
import { formatTimeWithMs } from './snapshotUtils';

interface TimelineBarProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  snapshots: Screenshot[];
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onStep: (delta: number) => void;
  stepSeconds: number;
}

const TimelineBar: React.FC<TimelineBarProps> = ({
  currentTime,
  duration,
  isPlaying,
  snapshots,
  onSeek,
  onTogglePlay,
  onStep,
  stepSeconds
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [hoveredSnapshot, setHoveredSnapshot] = useState<Screenshot | null>(null);

  const safeDuration = duration > 0 ? duration : 1;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  const getTimeFromEvent = useCallback((e: MouseEvent | React.MouseEvent): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = rect.width > 0 ? x / rect.width : 0;
    return ratio * safeDuration;
  }, [safeDuration]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    const newTime = getTimeFromEvent(e);
    onSeek(newTime);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setHoverX(x);
    setHoverTime((x / rect.width) * safeDuration);

    if (isScrubbing) {
      const newTime = getTimeFromEvent(e);
      onSeek(newTime);
    }
  };

  const handleMouseLeave = () => {
    if (!isScrubbing) {
      setHoverTime(null);
    }
  };

  // Window-level mouseup and mousemove while scrubbing
  useEffect(() => {
    if (!isScrubbing) return;

    const onGlobalMouseMove = (e: MouseEvent) => {
      const newTime = getTimeFromEvent(e);
      onSeek(newTime);
    };

    const onGlobalMouseUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [isScrubbing, getTimeFromEvent, onSeek]);

  return (
    <div className="flex-shrink-0 bg-[#08080a] border-t border-gray-800/80 px-4 py-2.5 z-20 select-none">
      
      {/* 1. Scrubber Track Container */}
      <div 
        className="relative py-2 cursor-pointer group"
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Track Bar Background */}
        <div className="relative w-full h-2 rounded-full bg-gray-800/80 overflow-visible">
          
          {/* Played Progress Bar */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-indigo-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Hover preview line */}
          {hoverTime !== null && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white/40 pointer-events-none"
              style={{ left: `${hoverX}px` }}
            />
          )}

          {/* Scrubber Playhead Handle */}
          <div 
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-md shadow-black/50 border border-gray-300 ${
              isScrubbing ? 'scale-110' : ''
            }`}
            style={{ left: `${progressPercent}%` }}
          />

          {/* Snapshot Pin Markers */}
          {snapshots.map((snap) => {
            const pinPercent = (snap.timestamp / safeDuration) * 100;
            return (
              <div
                key={snap.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(snap.timestamp);
                }}
                onMouseEnter={() => setHoveredSnapshot(snap)}
                onMouseLeave={() => setHoveredSnapshot(null)}
                style={{ left: `${pinPercent}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 p-1 group/pin cursor-pointer"
                title={`Snapshot at ${formatTimeWithMs(snap.timestamp)}`}
              >
                <div className="w-2.5 h-2.5 rotate-45 bg-amber-400 hover:bg-amber-300 border border-amber-950 shadow-sm rounded-xs transition-colors" />
              </div>
            );
          })}
        </div>

        {/* Hover Time Tooltip */}
        {hoverTime !== null && !hoveredSnapshot && (
          <div 
            className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700 text-white font-mono text-[11px] pointer-events-none shadow-lg tabular-nums z-30"
            style={{ left: `${hoverX}px` }}
          >
            {formatTimeWithMs(hoverTime)}
          </div>
        )}

        {/* Hovered Snapshot Thumbnail Popup Tooltip */}
        {hoveredSnapshot && (
          <div 
            className="absolute -top-28 -translate-x-1/2 p-1.5 rounded-lg bg-gray-950 border border-amber-500/50 shadow-2xl pointer-events-none z-40 flex flex-col items-center gap-1"
            style={{ left: `${(hoveredSnapshot.timestamp / safeDuration) * 100}%` }}
          >
            <div className="w-28 h-16 rounded overflow-hidden bg-black border border-gray-800">
              <img src={hoveredSnapshot.url} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="font-mono text-[10px] text-amber-300 font-semibold tabular-nums">
              {formatTimeWithMs(hoveredSnapshot.timestamp)}
            </span>
          </div>
        )}
      </div>

      {/* 2. Timeline Controls & Timecode Bar */}
      <div className="flex items-center justify-between gap-3 pt-1 text-xs">
        
        {/* Left: Timecode Readout */}
        <div className="flex items-center gap-2 font-mono tabular-nums text-gray-300">
          <span className="text-white font-semibold text-xs sm:text-sm">
            {formatTimeWithMs(currentTime)}
          </span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400 text-xs">
            {formatTimeWithMs(duration)}
          </span>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <span className="text-gray-500 text-[11px] hidden sm:inline">
            -{formatTimeWithMs(Math.max(0, duration - currentTime))} left
          </span>
        </div>

        {/* Center: Precision Transport Buttons */}
        <div className="flex items-center gap-1">
          {/* -5s Jump */}
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
            className="px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-800/80 font-mono text-[11px] transition-colors"
            title="Seek -5s (J)"
          >
            -5s
          </button>

          {/* -1 Step */}
          <button
            type="button"
            onClick={() => onStep(-1)}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors"
            title="Step back (←)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="p-1.5 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors border border-gray-700"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* +1 Step */}
          <button
            type="button"
            onClick={() => onStep(1)}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors"
            title="Step forward (→)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>

          {/* +5s Jump */}
          <button
            type="button"
            onClick={() => onSeek(Math.min(duration, currentTime + 5))}
            className="px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-800/80 font-mono text-[11px] transition-colors"
            title="Seek +5s (L)"
          >
            +5s
          </button>
        </div>

        {/* Right: Quick snapshot pins badge */}
        <div className="flex items-center gap-2">
          {snapshots.length > 0 && (
            <div className="flex items-center gap-1.5 text-amber-400/90 text-[11px] font-mono bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>{snapshots.length} marker{snapshots.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default TimelineBar;
