// ─── Job / Queue ─────────────────────────────────────────────────────────────

export type JobStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "error"
  | "cancelled";

export interface JobProgress {
  id: string;
  percent: number;
  fps: number;
  speed: number;
  frame: number;
  time: string;
  sizeKb: number;
  etaSeconds: number | null;
}

export interface Job {
  id: string;
  inputPath: string;
  outputPath: string;
  fileName: string;
  status: JobStatus;
  progress: JobProgress | null;
  error: string | null;
  settings: ConversionSettings;
  addedAt: number;
}

// ─── Conversion Settings ─────────────────────────────────────────────────────

export type VideoCodec =
  | "copy"
  | "libx264"
  | "libx265"
  | "libvpx-vp9"
  | "libaom-av1"
  | "mpeg4"
  | "prores_ks"
  | "libtheora";

export type AudioCodec =
  | "copy"
  | "aac"
  | "libmp3lame"
  | "flac"
  | "libopus"
  | "pcm_s16le"
  | "libvorbis"
  | "ac3"
  | "eac3";

export type RateControlMode = "crf" | "cbr" | "vbr";

export interface VideoSettings {
  codec: VideoCodec;
  resolution: string; // e.g. "1920x1080", "source", "1280x720"
  framerate: string; // e.g. "30", "60", "source"
  rateControl: RateControlMode;
  crfValue: number; // 0-51
  bitrate: string; // e.g. "4000k"
  preset: string; // ultrafast..veryslow
  pixFmt: string; // yuv420p, yuv444p
  hwAccel: string; // none, nvenc, qsv, videotoolbox, vaapi
}

export interface AudioSettings {
  codec: AudioCodec;
  bitrate: string; // e.g. "192k"
  sampleRate: string; // e.g. "44100", "48000", "source"
  channels: string; // e.g. "2", "1", "6", "source"
}

export interface TrimSettings {
  enabled: boolean;
  startTime: string; // HH:MM:SS.ms
  endTime: string;
}

export interface HlsSettings {
  segmentDuration: number;   // -hls_time (seconds per segment)
  listSize: number;          // -hls_list_size (0 = keep all)
  playlistType: "vod" | "event" | "none";  // -hls_playlist_type
  startNumber: number;       // -start_number (first segment index)
}

export interface ConversionSettings {
  outputFormat: string;
  videoSettings: VideoSettings;
  audioSettings: AudioSettings;
  trim: TrimSettings;
  hlsSettings: HlsSettings;
  outputDir: string;
  outputFileSuffix: string;
}

// ─── Media Info (from ffprobe) ────────────────────────────────────────────────

export interface StreamInfo {
  index: number;
  codecType: string;
  codecName: string;
  width?: number;
  height?: number;
  frameRate?: string;
  bitRate?: number;
  channels?: number;
  sampleRate?: number;
  language?: string;
}

export interface MediaInfo {
  formatName: string;
  durationSeconds: number;
  sizeBytes: number;
  bitRate: number;
  streams: StreamInfo[];
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export interface Preset {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: Partial<ConversionSettings> & {
    videoSettings?: Partial<VideoSettings>;
    audioSettings?: Partial<AudioSettings>;
  };
}
