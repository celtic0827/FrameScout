import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Screenshot, VideoMetadata } from '../../types';
import { QuickSnapshotSettings } from './types';
import {
  captureVideoFrame,
  copyBlobToClipboard,
  playShutterSound
} from './snapshotUtils';
import SnapshotSettingsCol from './SnapshotSettingsCol';
import VideoPreviewCol from './VideoPreviewCol';
import SnapshotListCol from './SnapshotListCol';
import TimelineBar from './TimelineBar';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface QuickSnapshotViewProps {
  videoFile: File | null;
  metadata: VideoMetadata | null;
  snapshots: Screenshot[];
  onAddSnapshot: (snapshot: Screenshot) => void;
  onDeleteSnapshot: (id: string) => void;
  onClearAllSnapshots: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpenStitchModal: () => void;
  onSelectFile?: (file: File) => void;
}

const QuickSnapshotView: React.FC<QuickSnapshotViewProps> = ({
  videoFile,
  metadata,
  snapshots,
  onAddSnapshot,
  onDeleteSnapshot,
  onClearAllSnapshots,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onOpenStitchModal,
  onSelectFile
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Settings
  const [settings, setSettings] = useState<QuickSnapshotSettings>(() => {
    try {
      const saved = localStorage.getItem('fs_quick_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      scale: 100,
      format: 'image/png',
      autoCopy: false,
      stepSeconds: 0.033
    };
  });

  // Save settings changes
  useEffect(() => {
    localStorage.setItem('fs_quick_settings', JSON.stringify(settings));
  }, [settings]);

  const handleUpdateSettings = (partial: Partial<QuickSnapshotSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  // Video Source Management
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!videoFile) {
      setVideoSrc(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  // Video Player Runtime State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(metadata ? metadata.duration : 0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Sync video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || (metadata ? metadata.duration : 0));
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoSrc, metadata]);

  // Play / Pause Toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().catch((err) => console.warn('Play error:', err));
    } else {
      video.pause();
    }
  }, []);

  // Frame Stepping
  const handleStep = useCallback((direction: number) => {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
    }

    const delta = direction * settings.stepSeconds;
    const newTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [settings.stepSeconds]);

  // Seek
  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(video.duration || duration, time));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  // Capture Frame Action
  const filenamePrefix = useMemo(() => {
    return videoFile ? videoFile.name.replace(/\.[^/.]+$/, '') : 'frame_scout';
  }, [videoFile]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // Trigger visual flash
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 220);

    // Play tactile audio shutter click
    playShutterSound();

    const snapshot = await captureVideoFrame(
      video,
      settings.scale,
      settings.format,
      filenamePrefix
    );

    if (snapshot) {
      onAddSnapshot(snapshot);

      // Auto-copy to clipboard if enabled
      if (settings.autoCopy) {
        copyBlobToClipboard(snapshot.blob);
      }
    }
  }, [settings.scale, settings.format, settings.autoCopy, filenamePrefix, onAddSnapshot]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // S or C: Capture
      if (e.key === 's' || e.key === 'S' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleCapture();
        return;
      }

      // Space: Play / Pause
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Left Arrow: Step back
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const multiplier = e.shiftKey ? 5 : 1;
        handleStep(-1 * multiplier);
        return;
      }

      // Right Arrow: Step forward
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const multiplier = e.shiftKey ? 5 : 1;
        handleStep(1 * multiplier);
        return;
      }

      // J: Seek back 5s
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleSeek(currentTime - 5);
        return;
      }

      // K: Play/Pause toggle
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
        return;
      }

      // L: Seek forward 5s
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleSeek(currentTime + 5);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCapture, togglePlay, handleStep, handleSeek, currentTime]);

  // ZIP download for all captured snapshots
  const handleDownloadAllZip = async () => {
    if (snapshots.length === 0 || isZipping) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();
      snapshots.forEach((s) => {
        zip.file(s.fileName, s.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${filenamePrefix}_snapshots.zip`);
    } catch (err) {
      console.error('Failed to zip snapshots:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#030304] overflow-hidden">
      
      {/* Top 3-Column Studio Layout */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        
        {/* Top Left: Settings */}
        <div className="w-full md:w-64 lg:w-72 xl:w-80 flex-shrink-0 max-h-[30vh] md:max-h-full">
          <SnapshotSettingsCol
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            metadata={metadata}
            snapshotCount={snapshots.length}
            onClearAll={onClearAllSnapshots}
          />
        </div>

        {/* Top Center: Video Preview & Live Player */}
        <div className="flex-1 min-w-0 min-h-0">
          <VideoPreviewCol
            videoRef={videoRef}
            videoFile={videoFile}
            videoSrc={videoSrc}
            metadata={metadata}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            isMuted={isMuted}
            isShutterFlashing={isShutterFlashing}
            onTogglePlay={togglePlay}
            onStep={handleStep}
            onPlaybackRateChange={setPlaybackRate}
            onToggleMute={() => setIsMuted((prev) => !prev)}
            onCapture={handleCapture}
            onSelectFile={onSelectFile}
          />
        </div>

        {/* Top Right: Snapshot List */}
        <div className="w-full md:w-72 lg:w-80 xl:w-96 flex-shrink-0 max-h-[35vh] md:max-h-full">
          <SnapshotListCol
            snapshots={snapshots}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
            onDeleteSnapshot={onDeleteSnapshot}
            onSeekToTimestamp={handleSeek}
            onOpenStitchModal={onOpenStitchModal}
            onDownloadAllZip={handleDownloadAllZip}
            isZipping={isZipping}
          />
        </div>

      </div>

      {/* Bottom Full-Width Interactive Timeline */}
      <TimelineBar
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        snapshots={snapshots}
        onSeek={handleSeek}
        onTogglePlay={togglePlay}
        onStep={handleStep}
        stepSeconds={settings.stepSeconds}
      />

    </div>
  );
};

export default QuickSnapshotView;
