export interface QuickSnapshotSettings {
  scale: number; // 50, 75, 100
  format: 'image/png' | 'image/jpeg';
  autoCopy: boolean;
  stepSeconds: number; // e.g. 1/30 (~0.033), 5/30 (~0.167), 1.0
}

export type SnapshotDensity = 'normal' | 'compact';
