export interface Screenshot {
  id: string;
  blob: Blob;
  url: string;
  timestamp: number;
  fileName: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  filename: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  LOADING_VIDEO = 'LOADING_VIDEO',
  EXTRACTING = 'EXTRACTING',
  ZIPPING = 'ZIPPING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}