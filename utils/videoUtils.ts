import { Screenshot, VideoMetadata } from '../types';

export const loadVideo = (file: File): Promise<{ video: HTMLVideoElement; metadata: VideoMetadata }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      resolve({
        video,
        metadata: {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          filename: file.name
        }
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video file.'));
    };
  });
};

// Helper to capture a frame from video to blob
const captureFrame = async (video: HTMLVideoElement, scale: number): Promise<{ blob: Blob | null, width: number, height: number }> => {
  const canvas = document.createElement('canvas');
  const scaleFactor = Math.max(0.1, Math.min(1, scale / 100));
  canvas.width = Math.floor(video.videoWidth * scaleFactor);
  canvas.height = Math.floor(video.videoHeight * scaleFactor);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return { blob: null, width: 0, height: 0 };

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => 
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  );
  
  return { blob, width: canvas.width, height: canvas.height };
};

export const extractSpecificFrame = async (
  video: HTMLVideoElement,
  time: number,
  scale: number
): Promise<Screenshot | null> => {
  // Seek
  video.currentTime = time;
  await new Promise<void>((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
  });

  const { blob } = await captureFrame(video, scale);

  if (blob) {
    const url = URL.createObjectURL(blob);
    const timestampStr = new Date(time * 1000).toISOString().substr(11, 8).replace(/:/g, '-');
    return {
      id: crypto.randomUUID(),
      blob,
      url,
      timestamp: time,
      fileName: `frame_last_${timestampStr}.jpg`
    };
  }
  return null;
};

export const extractFrames = async (
  video: HTMLVideoElement,
  count: number,
  randomize: boolean,
  scale: number,
  onProgress: (progress: number) => void
): Promise<Screenshot[]> => {
  const screenshots: Screenshot[] = [];
  const duration = video.duration;
  
  // Calculate timestamps
  const step = duration / (count + 1);
  const timestamps = Array.from({ length: count }, (_, i) => {
    let t = step * (i + 1);
    if (randomize) {
      // Add random offset: +/- up to 40% of the step size
      const offset = (Math.random() - 0.5) * (step * 0.8);
      t += offset;
    }
    // Clamp between 0.1s and Duration - 0.1s to avoid black frames at very ends
    return Math.max(0.1, Math.min(duration - 0.1, t));
  }).sort((a, b) => a - b); // Sort to keep timeline order

  for (let i = 0; i < timestamps.length; i++) {
    const time = timestamps[i];
    
    // Seek
    video.currentTime = time;
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
    });

    const { blob } = await captureFrame(video, scale);

    if (blob) {
      const url = URL.createObjectURL(blob);
      const timestampStr = new Date(time * 1000).toISOString().substr(11, 8).replace(/:/g, '-');
      
      screenshots.push({
        id: crypto.randomUUID(),
        blob,
        url,
        timestamp: time,
        fileName: `frame_${timestampStr}.jpg`
      });
    }

    // Update progress (0 to 100)
    onProgress(Math.round(((i + 1) / count) * 100));
  }

  // Cleanup video src is handled by the caller or global cleanup
  return screenshots;
};

export const formatTime = (seconds: number): string => {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 8);
};