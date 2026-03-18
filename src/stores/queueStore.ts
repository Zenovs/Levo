import { create } from "zustand";
import type { Job, JobProgress, JobStatus } from "../lib/types";
import { generateId } from "../lib/utils";
import { defaultConversionSettings } from "../lib/ffmpegBuilder";
import { buildOutputPath } from "../lib/utils";
import type { ConversionSettings } from "../lib/types";

interface QueueState {
  jobs: Job[];
  selectedJobId: string | null;

  addFiles: (paths: string[], settings: ConversionSettings) => void;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  selectJob: (id: string | null) => void;
  updateJobStatus: (id: string, status: JobStatus, error?: string) => void;
  updateJobProgress: (id: string, progress: JobProgress) => void;
  updateJobOutputPath: (id: string, outputPath: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  jobs: [],
  selectedJobId: null,

  addFiles: (paths, settings) => {
    const newJobs: Job[] = paths.map((p) => {
      const outputPath = buildOutputPath(
        p,
        settings.outputDir,
        settings.outputFileSuffix,
        settings.outputFormat
      );
      return {
        id: generateId(),
        inputPath: p,
        outputPath,
        fileName: p.replace(/\\/g, "/").split("/").pop() ?? p,
        status: "pending",
        progress: null,
        error: null,
        settings: { ...settings },
        addedAt: Date.now(),
      };
    });
    set((state) => ({
      jobs: [...state.jobs, ...newJobs],
      selectedJobId: state.selectedJobId ?? newJobs[0]?.id ?? null,
    }));
  },

  removeJob: (id) =>
    set((state) => {
      const jobs = state.jobs.filter((j) => j.id !== id);
      const selectedJobId =
        state.selectedJobId === id ? (jobs[0]?.id ?? null) : state.selectedJobId;
      return { jobs, selectedJobId };
    }),

  clearCompleted: () =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.status !== "completed"),
    })),

  clearAll: () =>
    set({ jobs: [], selectedJobId: null }),

  selectJob: (id) => set({ selectedJobId: id }),

  updateJobStatus: (id, status, error) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, status, error: error ?? j.error } : j
      ),
    })),

  updateJobProgress: (id, progress) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, progress } : j
      ),
    })),

  updateJobOutputPath: (id, outputPath) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, outputPath } : j
      ),
    })),

  moveUp: (id) =>
    set((state) => {
      const jobs = [...state.jobs];
      const idx = jobs.findIndex((j) => j.id === id);
      if (idx <= 0) return {};
      [jobs[idx - 1], jobs[idx]] = [jobs[idx], jobs[idx - 1]];
      return { jobs };
    }),

  moveDown: (id) =>
    set((state) => {
      const jobs = [...state.jobs];
      const idx = jobs.findIndex((j) => j.id === id);
      if (idx < 0 || idx >= jobs.length - 1) return {};
      [jobs[idx], jobs[idx + 1]] = [jobs[idx + 1], jobs[idx]];
      return { jobs };
    }),
}));

void defaultConversionSettings;
