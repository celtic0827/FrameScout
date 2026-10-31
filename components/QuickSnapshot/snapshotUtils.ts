import { Screenshot } from '../../types';

/**
 * Format seconds into HH:MM:SS.ms (e.g. 01:23.45)
 */
export const formatTimeWithMs = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  
  const formattedMins = String(mins).padStart(2, '0');
  const formattedSecs = String(secs).padStart(2, '0');
  const formattedMs = String(ms).padStart(2, '0');

  return `${formattedMins}:${formattedSecs}.${formattedMs}`;
};

/**
 * Capture frame from live video element with custom scale and format
 */
export const captureVideoFrame = async (
  video: HTMLVideoElement,
  scale: number,
  format: 'image/png' | 'image/jpeg',
  filenamePrefix: string
): Promise<Screenshot | null> => {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const scaleFactor = Math.max(0.1, Math.min(1, scale / 100));
  canvas.width = Math.floor(video.videoWidth * scaleFactor);
  canvas.height = Math.floor(video.videoHeight * scaleFactor);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const mimeType = format;
  const quality = format === 'image/jpeg' ? 0.92 : undefined;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });

  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  const time = video.currentTime;
  const timeCodeStr = formatTimeWithMs(time).replace(':', 'm').replace('.', 's');
  const extension = format === 'image/png' ? 'png' : 'jpg';
  const fileName = `${filenamePrefix}_snap_${timeCodeStr}.${extension}`;

  return {
    id: crypto.randomUUID(),
    blob,
    url,
    timestamp: time,
    fileName
  };
};

/**
 * Copy image blob to system clipboard (converts to image/png if necessary for Chrome/Safari compatibility)
 */
export const copyBlobToClipboard = async (blob: Blob): Promise<boolean> => {
  try {
    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for clipboard conversion'));
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const converted = await new Promise<Blob | null>((resolve) => 
          canvas.toBlob(resolve, 'image/png')
        );
        if (converted) {
          pngBlob = converted;
        }
      }
      URL.revokeObjectURL(url);
    }

    const item = new ClipboardItem({ 'image/png': pngBlob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.warn('Clipboard write error:', err);
    return false;
  }
};

/**
 * Play a subtle shutter click using Web Audio API (no external audio files required)
 */
let audioCtx: AudioContext | null = null;
export const playShutterSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    // Mechanical click simulation
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.045);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    // Audio context may be restricted before user gesture
  }
};
