import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useQueueStore } from "./stores/queueStore";
import { useSettingsStore } from "./stores/settingsStore";
import { QueuePanel } from "./components/QueuePanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { FFmpegPreview } from "./components/FFmpegPreview";
import { PresetBar } from "./components/PresetBar";
import { DropZone } from "./components/DropZone";
import { Button, Badge, Progress, Separator } from "./components/ui/index";
import { buildFFmpegArgs } from "./lib/ffmpegBuilder";
import { buildOutputPath } from "./lib/utils";
import { Play, Square, Loader2, Info } from "lucide-react";
import type { JobProgress } from "./lib/types";

export default function App() {
  const { jobs, selectedJobId, updateJobStatus, updateJobProgress, updateJobOutputPath } = useQueueStore();
  const { settings } = useSettingsStore();
  const [isRunning, setIsRunning] = useState(false);
  const [ffmpegVersion, setFfmpegVersion] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const activeJobIdRef = useRef<string | null>(null);
  const unlistenRef = useRef<(() => void)[]>([]);

  // Check FFmpeg version on startup
  useEffect(() => {
    invoke<string>("get_ffmpeg_version")
      .then((v) => setFfmpegVersion(v))
      .catch(() => setFfmpegVersion(null));
  }, []);

  // Listen to progress events
  useEffect(() => {
    const setup = async () => {
      const unlisten1 = await listen<JobProgress>("job:progress", (event) => {
        const p = event.payload;
        updateJobProgress(p.id, p);
      });

      const unlisten2 = await listen<{ id: string; outputPath: string }>(
        "job:completed",
        (event) => {
          updateJobStatus(event.payload.id, "completed");
          processNextJob();
        }
      );

      const unlisten3 = await listen<{ id: string; message: string }>(
        "job:error",
        (event) => {
          updateJobStatus(event.payload.id, "error", event.payload.message);
          processNextJob();
        }
      );

      unlistenRef.current = [unlisten1, unlisten2, unlisten3];
    };

    setup();
    return () => {
      unlistenRef.current.forEach((fn) => fn());
    };
  }, []);

  async function processNextJob() {
    const currentJobs = useQueueStore.getState().jobs;
    const nextJob = currentJobs.find((j) => j.status === "pending");

    if (!nextJob) {
      setIsRunning(false);
      activeJobIdRef.current = null;
      return;
    }

    activeJobIdRef.current = nextJob.id;
    updateJobStatus(nextJob.id, "running");

    const currentSettings = useSettingsStore.getState().settings;
    const outputPath = buildOutputPath(
      nextJob.inputPath,
      currentSettings.outputDir,
      currentSettings.outputFileSuffix,
      currentSettings.outputFormat
    );

    updateJobOutputPath(nextJob.id, outputPath);

    const args = buildFFmpegArgs(
      nextJob.inputPath,
      outputPath,
      nextJob.settings
    );

    try {
      await invoke("start_job", {
        jobId: nextJob.id,
        args,
        inputPath: nextJob.inputPath,
        outputPath,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      updateJobStatus(nextJob.id, "error", msg);
      processNextJob();
    }
  }

  async function startConversion() {
    if (isRunning) return;
    const pendingJobs = jobs.filter((j) => j.status === "pending");
    if (pendingJobs.length === 0) return;

    setIsRunning(true);
    await processNextJob();
  }

  async function stopConversion() {
    if (activeJobIdRef.current) {
      try {
        await invoke("cancel_job", { jobId: activeJobIdRef.current });
        updateJobStatus(activeJobIdRef.current, "cancelled");
      } catch (e) {
        console.error("Cancel error:", e);
      }
    }
    setIsRunning(false);
    activeJobIdRef.current = null;
  }

  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const runningJob = jobs.find((j) => j.status === "running");
  const overallProgress = runningJob?.progress?.percent ?? 0;

  return (
    <DropZone>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
        {/* ── Title Bar ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 h-10 bg-card/50 border-b border-border select-none"
          data-tauri-drag-region
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">FFmpegUI</span>
            {ffmpegVersion ? (
              <Badge variant="secondary" className="text-xs">
                FFmpeg {ffmpegVersion}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                FFmpeg nicht gefunden
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isRunning && runningJob && (
              <div className="flex items-center gap-2 mr-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <Progress value={overallProgress} className="w-32 h-1.5" />
                <span className="text-xs text-muted-foreground">
                  {Math.round(overallProgress)}%
                </span>
              </div>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setShowAbout((s) => !s)}
              title="Über FFmpegUI"
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ── About Modal ─────────────────────────────────────────────────────── */}
        {showAbout && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAbout(false)}
          >
            <div
              className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold mb-2">FFmpegUI</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Eine plattformübergreifende Desktop-Anwendung für FFmpeg.
                Konvertiere Audio- und Videodateien ohne Kommandozeile.
              </p>
              <p className="text-xs text-muted-foreground">Version 0.1.0 • MIT License</p>
              <p className="text-xs text-muted-foreground mt-1">
                FFmpeg wird unter LGPL/GPL-Lizenz genutzt.
              </p>
              <Button className="mt-4 w-full" onClick={() => setShowAbout(false)}>
                Schließen
              </Button>
            </div>
          </div>
        )}

        {/* ── Preset Bar ──────────────────────────────────────────────────────── */}
        <PresetBar />

        {/* ── Main Layout ─────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Queue Sidebar */}
          <div className="w-64 shrink-0 border-r border-border overflow-hidden flex flex-col">
            <QueuePanel />
          </div>

          {/* Settings Panel */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedJobId || jobs.length === 0 ? (
              <SettingsPanel />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Wähle eine Datei in der Warteschlange
              </div>
            )}
          </div>
        </div>

        {/* ── FFmpeg Command Preview ───────────────────────────────────────────── */}
        <FFmpegPreview />

        {/* ── Bottom Action Bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-card/30">
          <div className="text-xs text-muted-foreground">
            {jobs.length === 0
              ? "Keine Dateien in der Warteschlange"
              : `${pendingCount} wartend • ${jobs.filter((j) => j.status === "completed").length} fertig • ${jobs.filter((j) => j.status === "error").length} Fehler`}
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button
                variant="destructive"
                className="gap-2 min-w-[180px]"
                onClick={stopConversion}
              >
                <Square className="h-4 w-4" />
                Abbrechen
              </Button>
            ) : (
              <Button
                className="gap-2 min-w-[180px]"
                onClick={startConversion}
                disabled={pendingCount === 0 || !ffmpegVersion}
              >
                <Play className="h-4 w-4" />
                {pendingCount === 0
                  ? "Keine Aufgaben"
                  : `Konvertierung starten (${pendingCount})`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DropZone>
  );
}
