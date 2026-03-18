import { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useQueueStore } from "./stores/queueStore";
import { useSettingsStore } from "./stores/settingsStore";
import { QueuePanel } from "./components/QueuePanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { FFmpegPreview } from "./components/FFmpegPreview";
import { PresetBar } from "./components/PresetBar";
import { DropZone } from "./components/DropZone";
import { ThemeToggle } from "./components/ThemeToggle";
import { UpdateDialog } from "./components/UpdateDialog";
import { buildFFmpegArgs } from "./lib/ffmpegBuilder";
import { buildOutputPath } from "./lib/utils";
import { Play, Square, Loader2, Info, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { JobProgress } from "./lib/types";

export default function App() {
  const { jobs, updateJobStatus, updateJobProgress, updateJobOutputPath } = useQueueStore();
  const { settings } = useSettingsStore();
  const [isRunning, setIsRunning] = useState(false);
  const [ffmpegVersion, setFfmpegVersion] = useState<string | null>(null);
  const [ffmpegError, setFfmpegError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const activeJobIdRef = useRef<string | null>(null);
  const unlistenRef = useRef<(() => void)[]>([]);

  // ── Check FFmpeg on startup ──────────────────────────────────────────────
  useEffect(() => {
    invoke<string>("get_ffmpeg_version")
      .then((v) => { setFfmpegVersion(v); setFfmpegError(null); })
      .catch((e) => { setFfmpegVersion(null); setFfmpegError(String(e)); });
  }, []);

  // ── Event listeners ──────────────────────────────────────────────────────
  const processNextJob = useCallback(async () => {
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

    const args = buildFFmpegArgs(nextJob.inputPath, outputPath, nextJob.settings);

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
  }, [updateJobStatus, updateJobOutputPath]);

  useEffect(() => {
    const setup = async () => {
      const u1 = await listen<JobProgress>("job:progress", (ev) => {
        updateJobProgress(ev.payload.id, ev.payload);
      });
      const u2 = await listen<{ id: string; outputPath: string }>("job:completed", (ev) => {
        updateJobStatus(ev.payload.id, "completed");
        processNextJob();
      });
      const u3 = await listen<{ id: string; message: string }>("job:error", (ev) => {
        updateJobStatus(ev.payload.id, "error", ev.payload.message);
        processNextJob();
      });
      unlistenRef.current = [u1, u2, u3];
    };
    setup();
    return () => { unlistenRef.current.forEach((fn) => fn()); };
  }, [processNextJob, updateJobProgress, updateJobStatus]);

  // ── Conversion control ───────────────────────────────────────────────────
  async function startConversion() {
    if (isRunning) return;
    const pending = jobs.filter((j) => j.status === "pending");
    if (pending.length === 0) return;
    setIsRunning(true);
    await processNextJob();
  }

  async function stopConversion() {
    if (activeJobIdRef.current) {
      try {
        await invoke("cancel_job", { jobId: activeJobIdRef.current });
        updateJobStatus(activeJobIdRef.current, "cancelled");
      } catch (e) { console.error("Cancel:", e); }
    }
    setIsRunning(false);
    activeJobIdRef.current = null;
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const pendingCount   = jobs.filter((j) => j.status === "pending").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const errorCount     = jobs.filter((j) => j.status === "error").length;
  const runningJob     = jobs.find((j) => j.status === "running");
  const overallPct     = runningJob?.progress?.percent ?? 0;

  return (
    <DropZone>
      <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>

        {/* ── Title Bar ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 h-11 shrink-0 select-none"
          style={{
            background: "var(--gradient-header)",
            borderBottom: "1px solid var(--border)",
          }}
          data-tauri-drag-region
        >
          {/* Left: Brand */}
          <div className="flex items-center gap-3" data-tauri-drag-region>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs"
                style={{ background: "var(--gradient-brand)", color: "white", boxShadow: "0 2px 8px var(--primary-glow)" }}
              >
                L
              </div>
              <span className="font-bold text-sm tracking-tight" style={{ color: "var(--text-primary)" }}>
                Levo
              </span>
            </div>

            {/* FFmpeg status */}
            {ffmpegVersion ? (
              <div
                className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success)" }}
              >
                <CheckCircle2 className="h-3 w-3" />
                FFmpeg {ffmpegVersion}
              </div>
            ) : (
              <button
                className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs transition-opacity hover:opacity-80"
                style={{ background: "var(--error-bg)", color: "var(--error)", border: "1px solid var(--error)" }}
                onClick={() => setShowAbout(true)}
                title={ffmpegError ?? "FFmpeg nicht gefunden"}
              >
                <AlertTriangle className="h-3 w-3" />
                FFmpeg fehlt
              </button>
            )}
          </div>

          {/* Center: running progress */}
          {isRunning && runningJob && (
            <div className="flex items-center gap-2" data-tauri-drag-region>
              <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--primary)" }} />
              <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-overlay)" }}>
                <div
                  className="h-full rounded-full progress-bar-animated transition-all duration-500"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <span className="text-xs font-mono" style={{ color: "var(--primary)" }}>
                {Math.round(overallPct)}%
              </span>
              {runningJob.progress?.speed != null && runningJob.progress.speed > 0 && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {runningJob.progress.speed.toFixed(1)}×
                </span>
              )}
            </div>
          )}

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="w-px h-5" style={{ background: "var(--border)" }} />
            <button
              className="rounded-lg p-2 transition-colors hover:bg-[color:var(--bg-overlay)]"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setShowUpdate(true)}
              title="Auf Updates prüfen"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              className="rounded-lg p-2 transition-colors hover:bg-[color:var(--bg-overlay)]"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setShowAbout(true)}
              title="Über Levo"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Preset Bar ────────────────────────────────────────────────────── */}
        <PresetBar />

        {/* ── Main Area ─────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Queue Sidebar */}
          <div
            className="w-64 shrink-0 flex flex-col overflow-hidden"
            style={{ borderRight: "1px solid var(--border)", background: "var(--bg-surface)" }}
          >
            <QueuePanel />
          </div>

          {/* Settings */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ background: "var(--bg-base)" }}>
            {jobs.length === 0 ? (
              /* Hero empty state */
              <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl font-black"
                  style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 32px var(--primary-glow)" }}
                >
                  L
                </div>
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Willkommen bei Levo
                  </h1>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Ziehe Mediendateien in dieses Fenster oder klicke auf „Dateien hinzufügen"
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                  {["MP4", "MKV", "MP3", "AAC", "FLAC", "WebM", "GIF", "MOV"].map((fmt) => (
                    <span
                      key={fmt}
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                    >
                      {fmt}
                    </span>
                  ))}
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  >
                    +20 mehr
                  </span>
                </div>
              </div>
            ) : (
              <SettingsPanel />
            )}
          </div>
        </div>

        {/* ── FFmpeg Preview ────────────────────────────────────────────────── */}
        <FFmpegPreview />

        {/* ── Action Bar ────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}
        >
          {/* Stats */}
          <div className="flex items-center gap-4">
            {[
              { count: pendingCount, label: "wartend", color: "var(--text-muted)" },
              { count: completedCount, label: "fertig", color: "var(--success)" },
              { count: errorCount, label: "Fehler", color: "var(--error)" },
            ].map(({ count, label, color }) => (
              count > 0 ? (
                <div key={label} className="flex items-center gap-1">
                  <span className="font-bold text-sm" style={{ color }}>{count}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                </div>
              ) : null
            ))}
            {jobs.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Keine Dateien in der Warteschlange
              </p>
            )}
          </div>

          {/* Start / Stop button */}
          {isRunning ? (
            <button
              onClick={stopConversion}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: "var(--error-bg)", color: "var(--error)", border: "1px solid var(--error)" }}
            >
              <Square className="h-4 w-4" />
              Abbrechen
            </button>
          ) : (
            <button
              onClick={startConversion}
              disabled={pendingCount === 0 || !ffmpegVersion}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: pendingCount > 0 && ffmpegVersion ? "var(--gradient-brand)" : "var(--bg-overlay)",
                color: "white",
                boxShadow: pendingCount > 0 && ffmpegVersion ? "0 2px 12px var(--primary-glow)" : "none",
              }}
            >
              <Play className="h-4 w-4" />
              {pendingCount === 0
                ? "Keine Aufgaben"
                : `${pendingCount} Datei${pendingCount > 1 ? "en" : ""} konvertieren`}
            </button>
          )}
        </div>

        {/* ── About Dialog ──────────────────────────────────────────────────── */}
        {showAbout && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowAbout(false)}
          >
            <div
              className="relative w-full max-w-sm mx-4 rounded-2xl p-6 shadow-2xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  L
                </div>
                <div>
                  <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Levo</h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>FFmpeg Desktop GUI • v0.1.0</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Konvertiere Audio- und Videodateien ohne Kommandozeile. Levo nutzt FFmpeg für alle Konvertierungen.
              </p>
              {!ffmpegVersion && (
                <div
                  className="mt-4 rounded-xl p-3 text-xs"
                  style={{ background: "var(--error-bg)", border: "1px solid var(--error)", color: "var(--error)" }}
                >
                  <p className="font-semibold mb-1">FFmpeg nicht gefunden</p>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Bitte FFmpeg installieren:<br />
                    Linux: <code>sudo apt install ffmpeg</code><br />
                    macOS: <code>brew install ffmpeg</code><br />
                    Windows: Wird automatisch mitgeliefert.
                  </p>
                </div>
              )}
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>MIT License • FFmpeg unter LGPL/GPL</p>
              </div>
              <button
                className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
                style={{ background: "var(--bg-overlay)", color: "var(--text-primary)" }}
                onClick={() => setShowAbout(false)}
              >
                Schließen
              </button>
            </div>
          </div>
        )}

        {/* ── Update Dialog ─────────────────────────────────────────────────── */}
        {showUpdate && <UpdateDialog onClose={() => setShowUpdate(false)} />}
      </div>
    </DropZone>
  );
}
