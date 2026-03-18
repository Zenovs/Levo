export interface FormatDef {
  ext: string;
  label: string;
  description: string;
  type: "video" | "audio" | "image";
  defaultVideoCodec: string;
  defaultAudioCodec: string;
}

export const FORMATS: FormatDef[] = [
  // Video
  { ext: "mp4",  label: "MP4",   type: "video", description: "Universell kompatibel (H.264/AAC)", defaultVideoCodec: "libx264", defaultAudioCodec: "aac" },
  { ext: "mkv",  label: "MKV",   type: "video", description: "Matroska – flexible Container", defaultVideoCodec: "libx264", defaultAudioCodec: "aac" },
  { ext: "webm", label: "WebM",  type: "video", description: "Web-optimiert (VP9/Opus)", defaultVideoCodec: "libvpx-vp9", defaultAudioCodec: "libopus" },
  { ext: "mov",  label: "MOV",   type: "video", description: "Apple QuickTime", defaultVideoCodec: "libx264", defaultAudioCodec: "aac" },
  { ext: "avi",  label: "AVI",   type: "video", description: "Älteres Windows-Format", defaultVideoCodec: "libx264", defaultAudioCodec: "libmp3lame" },
  { ext: "flv",  label: "FLV",   type: "video", description: "Flash Video (Legacy)", defaultVideoCodec: "libx264", defaultAudioCodec: "aac" },
  { ext: "wmv",  label: "WMV",   type: "video", description: "Windows Media Video", defaultVideoCodec: "mpeg4", defaultAudioCodec: "aac" },
  { ext: "ts",   label: "TS",    type: "video", description: "MPEG Transport Stream", defaultVideoCodec: "libx264", defaultAudioCodec: "aac" },
  { ext: "m4v",  label: "M4V",   type: "video", description: "iTunes Video", defaultVideoCodec: "libx264", defaultAudioCodec: "aac" },
  { ext: "ogv",  label: "OGV",   type: "video", description: "Ogg Video (Open Source)", defaultVideoCodec: "libtheora", defaultAudioCodec: "libvorbis" },
  { ext: "gif",  label: "GIF",   type: "image", description: "Animiertes GIF", defaultVideoCodec: "gif", defaultAudioCodec: "none" },
  // Audio
  { ext: "mp3",  label: "MP3",   type: "audio", description: "Universelles Audio-Format", defaultVideoCodec: "none", defaultAudioCodec: "libmp3lame" },
  { ext: "aac",  label: "AAC",   type: "audio", description: "Modernes verlustbehaftetes Audio", defaultVideoCodec: "none", defaultAudioCodec: "aac" },
  { ext: "flac", label: "FLAC",  type: "audio", description: "Verlustfreies Audio", defaultVideoCodec: "none", defaultAudioCodec: "flac" },
  { ext: "wav",  label: "WAV",   type: "audio", description: "Unkomprimiertes Audio (PCM)", defaultVideoCodec: "none", defaultAudioCodec: "pcm_s16le" },
  { ext: "ogg",  label: "OGG",   type: "audio", description: "Offenes Audio-Format (Vorbis)", defaultVideoCodec: "none", defaultAudioCodec: "libvorbis" },
  { ext: "m4a",  label: "M4A",   type: "audio", description: "Apple Audio (AAC)", defaultVideoCodec: "none", defaultAudioCodec: "aac" },
  { ext: "opus", label: "OPUS",  type: "audio", description: "Modernes verlustbehaftetes Audio (Opus)", defaultVideoCodec: "none", defaultAudioCodec: "libopus" },
  { ext: "ac3",  label: "AC3",   type: "audio", description: "Dolby Digital Audio", defaultVideoCodec: "none", defaultAudioCodec: "ac3" },
];

export const VIDEO_CODECS = [
  { value: "copy",       label: "Stream Copy (kein Re-Encoding)", group: "Direkt" },
  { value: "libx264",    label: "H.264 (libx264)",  group: "H.264" },
  { value: "libx265",    label: "H.265 / HEVC",     group: "H.265" },
  { value: "libvpx-vp9", label: "VP9",              group: "VP9" },
  { value: "libaom-av1", label: "AV1",              group: "AV1" },
  { value: "mpeg4",      label: "MPEG-4",           group: "Ältere Codecs" },
  { value: "prores_ks",  label: "Apple ProRes",     group: "Profi" },
  { value: "libtheora",  label: "Theora",           group: "Ältere Codecs" },
];

export const AUDIO_CODECS = [
  { value: "copy",       label: "Stream Copy (kein Re-Encoding)" },
  { value: "aac",        label: "AAC" },
  { value: "libmp3lame", label: "MP3 (LAME)" },
  { value: "flac",       label: "FLAC (verlustfrei)" },
  { value: "libopus",    label: "Opus" },
  { value: "pcm_s16le",  label: "PCM 16-bit (WAV)" },
  { value: "libvorbis",  label: "Vorbis (OGG)" },
  { value: "ac3",        label: "AC3 (Dolby Digital)" },
  { value: "eac3",       label: "E-AC3 (Dolby Digital+)" },
];

export const RESOLUTIONS = [
  { value: "source", label: "Originalauflösung" },
  { value: "7680x4320", label: "8K (7680×4320)" },
  { value: "3840x2160", label: "4K UHD (3840×2160)" },
  { value: "2560x1440", label: "1440p QHD (2560×1440)" },
  { value: "1920x1080", label: "1080p FHD (1920×1080)" },
  { value: "1280x720",  label: "720p HD (1280×720)" },
  { value: "854x480",   label: "480p SD (854×480)" },
  { value: "640x360",   label: "360p (640×360)" },
  { value: "custom",    label: "Benutzerdefiniert..." },
];

export const FRAMERATES = [
  { value: "source", label: "Original FPS" },
  { value: "24",     label: "24 fps (Kino)" },
  { value: "25",     label: "25 fps (PAL)" },
  { value: "30",     label: "30 fps" },
  { value: "50",     label: "50 fps" },
  { value: "60",     label: "60 fps" },
];

export const ENCODING_PRESETS = [
  { value: "ultrafast", label: "Ultrafast (schnellste Kodierung, größte Datei)" },
  { value: "superfast", label: "Superfast" },
  { value: "veryfast",  label: "Very Fast" },
  { value: "faster",    label: "Faster" },
  { value: "fast",      label: "Fast" },
  { value: "medium",    label: "Medium (Standard)" },
  { value: "slow",      label: "Slow" },
  { value: "slower",    label: "Slower" },
  { value: "veryslow",  label: "Very Slow (beste Qualität, kleinste Datei)" },
];

export const AUDIO_BITRATES = [
  "64k", "96k", "128k", "160k", "192k", "256k", "320k",
];

export const VIDEO_BITRATES = [
  "500k", "1000k", "2000k", "4000k", "6000k", "8000k", "12000k", "20000k", "50000k",
];

export const SAMPLE_RATES = [
  { value: "source", label: "Original" },
  { value: "22050",  label: "22050 Hz" },
  { value: "44100",  label: "44100 Hz (CD)" },
  { value: "48000",  label: "48000 Hz (Video)" },
  { value: "96000",  label: "96000 Hz (Hi-Res)" },
];

export const CHANNELS = [
  { value: "source", label: "Original" },
  { value: "1",      label: "Mono" },
  { value: "2",      label: "Stereo" },
  { value: "6",      label: "5.1 Surround" },
  { value: "8",      label: "7.1 Surround" },
];

export const HW_ACCELS = [
  { value: "none",          label: "Keine (Software)" },
  { value: "nvenc",         label: "NVIDIA NVENC" },
  { value: "qsv",           label: "Intel QSV" },
  { value: "videotoolbox",  label: "Apple VideoToolbox" },
  { value: "vaapi",         label: "Linux VAAPI" },
];
