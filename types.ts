
export interface GeneratedMedia {
  id: string;
  uri: string; // Video URI or Base64 Image Data
  type: 'video' | 'image';
  prompt: string;
  aspectRatio: string;
  style: string;
  timestamp: number;
  hasWatermark: boolean;
}

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:3' | '3:4';

export interface VideoConfig {
  prompt: string;
  aspectRatio: AspectRatio;
  style: string;
  startImage?: string; // base64 string (raw)
  startImageMimeType?: string;
  generateType: 'video' | 'image';
}

export interface SplitSegment {
  id: string;
  index: number; // For chronological ordering
  startTime: number;
  endTime: number;
  duration: number;
  title: string;
  description: string;
  explanation: string;
  hashtags: string[];
  viralScore: number;
  thumbnail: string; // base64
  isLandscape: boolean;
  hasWatermark: boolean;
}

export type SplitDuration = 15 | 30 | 60 | 90;

export type SplitAspectRatio = 'Original' | '9:16' | '16:9' | '1:1';

export interface SplitOptions {
    duration: SplitDuration;
    overlap: number; // Seconds of overlap between clips
    minViralScore: number; // Only keep clips above this score
    aspectRatio: SplitAspectRatio;
}

export type GenerationStatus = 'idle' | 'generating' | 'error' | 'success';

export interface UserUsage {
  date: string;
  veoCount: number;
  splitCount: number;
}
