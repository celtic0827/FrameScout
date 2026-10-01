import { Screenshot } from './types';

export interface GridStitchOptions {
  rowCount: number; // Number of rows (行數)
  gap?: number; // Gap in px
  backgroundColor?: string;
  format?: 'image/jpeg' | 'image/png';
}

/**
 * Pure, isolated utility to stitch screenshots into a horizontal grid with custom row count.
 * Does NOT overlay timestamps and does not alter input screenshots.
 */
export const stitchFramesToGrid = async (
  screenshots: Screenshot[],
  options: GridStitchOptions
): Promise<Blob | null> => {
  if (screenshots.length === 0) return null;

  const {
    rowCount = 1,
    gap = 8,
    backgroundColor = '#000000',
    format = 'image/jpeg'
  } = options;

  try {
    const images = await Promise.all(
      screenshots.map((s) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image for stitching'));
          img.src = s.url;
        });
      })
    );

    const totalCount = images.length;
    // Calculate columns needed to distribute into specified rowCount
    // Each row will have at most colsPerRow items
    const effectiveRows = Math.min(Math.max(1, rowCount), totalCount);
    const colsPerRow = Math.ceil(totalCount / effectiveRows);

    // Target uniform width & height based on first image
    const cellWidth = images[0].naturalWidth || images[0].width;
    const cellHeight = images[0].naturalHeight || images[0].height;

    const totalCanvasWidth = colsPerRow * cellWidth + (colsPerRow + 1) * gap;
    const totalCanvasHeight = effectiveRows * cellHeight + (effectiveRows + 1) * gap;

    const canvas = document.createElement('canvas');
    canvas.width = totalCanvasWidth;
    canvas.height = totalCanvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Clean background fill
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < images.length; index++) {
      const img = images[index];
      const r = Math.floor(index / colsPerRow);
      const c = index % colsPerRow;

      const x = gap + c * (cellWidth + gap);
      const y = gap + r * (cellHeight + gap);

      // Draw clean image (no timestamp overlay)
      ctx.drawImage(img, x, y, cellWidth, cellHeight);
    }

    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format, format === 'image/jpeg' ? 0.92 : undefined)
    );
  } catch (error) {
    console.error('Error stitching frames to grid:', error);
    return null;
  }
};
