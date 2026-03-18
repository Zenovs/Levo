import { create } from "zustand";
import type { ConversionSettings, VideoSettings, AudioSettings, TrimSettings } from "../lib/types";
import { defaultConversionSettings } from "../lib/ffmpegBuilder";
import { FORMATS } from "../lib/formats";

interface SettingsState {
  settings: ConversionSettings;
  setOutputFormat: (format: string) => void;
  setVideoSettings: (patch: Partial<VideoSettings>) => void;
  setAudioSettings: (patch: Partial<AudioSettings>) => void;
  setTrim: (patch: Partial<TrimSettings>) => void;
  setOutputDir: (dir: string) => void;
  setOutputFileSuffix: (suffix: string) => void;
  applyPreset: (patch: Partial<ConversionSettings> & {
    videoSettings?: Partial<VideoSettings>;
    audioSettings?: Partial<AudioSettings>;
  }) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultConversionSettings(),

  setOutputFormat: (format) =>
    set((state) => {
      const def = FORMATS.find((f) => f.ext === format);
      return {
        settings: {
          ...state.settings,
          outputFormat: format,
          videoSettings: {
            ...state.settings.videoSettings,
            codec: (def?.defaultVideoCodec as ConversionSettings["videoSettings"]["codec"]) ??
              state.settings.videoSettings.codec,
          },
          audioSettings: {
            ...state.settings.audioSettings,
            codec: (def?.defaultAudioCodec as ConversionSettings["audioSettings"]["codec"]) ??
              state.settings.audioSettings.codec,
          },
        },
      };
    }),

  setVideoSettings: (patch) =>
    set((state) => ({
      settings: {
        ...state.settings,
        videoSettings: { ...state.settings.videoSettings, ...patch },
      },
    })),

  setAudioSettings: (patch) =>
    set((state) => ({
      settings: {
        ...state.settings,
        audioSettings: { ...state.settings.audioSettings, ...patch },
      },
    })),

  setTrim: (patch) =>
    set((state) => ({
      settings: {
        ...state.settings,
        trim: { ...state.settings.trim, ...patch },
      },
    })),

  setOutputDir: (dir) =>
    set((state) => ({ settings: { ...state.settings, outputDir: dir } })),

  setOutputFileSuffix: (suffix) =>
    set((state) => ({ settings: { ...state.settings, outputFileSuffix: suffix } })),

  applyPreset: (patch) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...patch,
        videoSettings: patch.videoSettings
          ? { ...state.settings.videoSettings, ...patch.videoSettings }
          : state.settings.videoSettings,
        audioSettings: patch.audioSettings
          ? { ...state.settings.audioSettings, ...patch.audioSettings }
          : state.settings.audioSettings,
      },
    })),

  resetSettings: () => set({ settings: defaultConversionSettings() }),
}));
