import { useQueueStore } from "../stores/queueStore";
import { useSettingsStore } from "../stores/settingsStore";
import { cn, basename, formatDuration } from "../lib/utils";
import type { Job } from "../lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import { FORMATS } from "../lib/formats";
import {
  Plus, Trash2, CheckCheck, ArrowUp, ArrowDown, X,
  Film, Music, FileImage, Clock, Loader2, CheckCircle2,
  AlertCircle, PauseCircle, FolderOpen, ListX
} from "lucide-react";

// ─── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:   { label: "Wartend",     dot: "bg-[color:var(--text-muted)]",  text: "var(--text-muted)" },
  running:   { label: "Läuft",       dot: "bg-[color:var(--primary)]",     text: "var(--primary)" },
  paused:    { label: "Pausiert",    dot: "bg-[color:var(--warning)]",     text: "var(--warning)" },
  completed: { label: "Fertig",      dot: "bg-[color:var(--success)]",     text: "var(--success)" },
  error:     { label: "Fehler",      dot: "bg-[color:var(--error)]",       text: "var(--error)" },
  cancelled: { label: "Abgebrochen", dot: "bg-[color:var(--text-muted)]",  text: "var(--text-muted)" },
};

function fileTypeIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const fmt = FORMATS.find((f) => f.ext === ext);
  if (fmt?.type === "audio") return <Music className="h-4 w-4" style={{ color: "var(--primary)" }} />;
  if (fmt?.type === "image") return <FileImage className="h-4 w-4" style={{ color: "var(--warning)" }} />;
  return <Film className="h-4 w-4" style={{ color: "var(--primary)" }} />;
}

function StatusIcon({ status }: { status: Job["status"] }) {
  if (status === "running")   return <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--primary)" }} />;
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--success)" }} />;
  if (status === "error")     return <AlertCircle className="h-3.5 w-3.5" style={{ color: "var(--error)" }} />;
  if (status === "paused")    return <PauseCircle className="h-3.5 w-3.5" style={{ color: "var(--warning)" }} />;
  return <Clock className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />;
}

// ─── Queue Item ───────────────────────────────────────────────────────────────

function QueueItem({ job }: { job: Job }) {
  const { selectedJobId, selectJob, removeJob, moveUp, moveDown } = useQueueStore();
  const isSelected = selectedJobId === job.id;
  const cfg = STATUS_CONFIG[job.status];
  const isRunning = job.status === "running";

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-3 cursor-pointer transition-all duration-150 select-none",
        isSelected
          ? "card-selected"
          : "hover:bg-[color:var(--bg-elevated)] hover:border-[color:var(--border)]"
      )}
      style={{
        background: isSelected ? "var(--primary-subtle)" : "var(--bg-surface)",
        borderColor: isSelected ? "var(--primary)" : "var(--border-subtle)",
      }}
      onClick={() => selectJob(job.id)}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div
          className="shrink-0 mt-0.5 rounded-lg p-1.5"
          style={{ background: "var(--bg-overlay)" }}
        >
          {fileTypeIcon(job.fileName)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs truncate" style={{ color: "var(--text-primary)" }} title={job.fileName}>
            {basename(job.fileName)}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
            <span className="text-xs font-mono uppercase font-semibold" style={{ color: "var(--primary)" }}>
              {job.settings.outputFormat}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>•</span>
            <StatusIcon status={job.status} />
            <span className="text-xs" style={{ color: cfg.text }}>{cfg.label}</span>
          </div>

          {/* Progress bar */}
          {isRunning && job.progress && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-overlay)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500 progress-bar-animated"
                  style={{ width: `${job.progress.percent}%` }}
                />
              </div>
              <div className="flex justify-between" style={{ color: "var(--text-muted)" }}>
                <span className="text-xs">{Math.round(job.progress.percent)}%</span>
                <span className="text-xs font-mono">
                  {job.progress.speed > 0 ? `${job.progress.speed.toFixed(1)}×` : ""}
                  {job.progress.etaSeconds != null
                    ? ` • ${formatDuration(job.progress.etaSeconds)}`
                    : ""}
                </span>
              </div>
            </div>
          )}

          {/* Error message */}
          {job.status === "error" && job.error && (
            <p className="mt-1 text-xs truncate" style={{ color: "var(--error)" }} title={job.error}>
              {job.error}
            </p>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div
        className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 rounded-lg p-0.5"
        style={{ background: "var(--bg-overlay)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="rounded-md p-1 transition-colors hover:bg-[color:var(--bg-surface)]"
          style={{ color: "var(--text-muted)" }}
          onClick={() => moveUp(job.id)}
          disabled={isRunning}
          title="Nach oben"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          className="rounded-md p-1 transition-colors hover:bg-[color:var(--bg-surface)]"
          style={{ color: "var(--text-muted)" }}
          onClick={() => moveDown(job.id)}
          disabled={isRunning}
          title="Nach unten"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
        <button
          className="rounded-md p-1 transition-colors hover:bg-[color:var(--error-bg)]"
          style={{ color: "var(--text-muted)" }}
          onClick={() => removeJob(job.id)}
          disabled={isRunning}
          title="Entfernen"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Queue Panel ──────────────────────────────────────────────────────────────

export function QueuePanel() {
  const { jobs, clearCompleted, clearAll } = useQueueStore();
  const { settings } = useSettingsStore();
  const { addFiles } = useQueueStore();

  const pendingCount  = jobs.filter((j) => j.status === "pending").length;
  const runningCount  = jobs.filter((j) => j.status === "running").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;

  async function handleAddFiles() {
    try {
      const selected = await open({
        multiple: true,
        title: "Mediendateien öffnen",
        filters: [
          {
            name: "Mediendateien",
            extensions: [
              "mp4","mkv","avi","mov","webm","flv","wmv","ts","m4v","ogv","3gp",
              "mp3","aac","flac","wav","ogg","m4a","opus","ac3","wma",
              "gif","png","jpg","jpeg",
            ],
          },
          { name: "Alle Dateien", extensions: ["*"] },
        ],
      });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        addFiles(paths, settings);
      }
    } catch (e) {
      console.error("File dialog error:", e);
    }
  }

  const totalJobs = jobs.length;
  const allDone = totalJobs > 0 && pendingCount === 0 && runningCount === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="section-header">Warteschlange</span>
          {totalJobs > 0 && (
            <span
              className="inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full text-xs font-bold px-1"
              style={{ background: "var(--primary)", color: "white" }}
            >
              {totalJobs}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {completedCount > 0 && (
            <button
              className="rounded-lg p-1.5 transition-colors hover:bg-[color:var(--bg-overlay)]"
              style={{ color: "var(--text-muted)" }}
              onClick={clearCompleted}
              title="Erledigte entfernen"
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </button>
          )}
          {totalJobs > 0 && (
            <button
              className="rounded-lg p-1.5 transition-colors hover:bg-[color:var(--error-bg)]"
              style={{ color: "var(--text-muted)" }}
              onClick={clearAll}
              title="Alle entfernen"
            >
              <ListX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {totalJobs > 0 && (
        <div
          className="mx-3 mb-2 rounded-lg px-3 py-1.5 flex items-center gap-3"
          style={{ background: "var(--bg-overlay)" }}
        >
          {[
            { count: pendingCount, label: "wartend", color: "var(--text-muted)" },
            { count: runningCount, label: "aktiv",   color: "var(--primary)" },
            { count: completedCount, label: "fertig", color: "var(--success)" },
          ].map(({ count, label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="font-bold text-xs" style={{ color }}>{count}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Job list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 pb-2">
        {totalJobs === 0 ? (
          /* Empty state */
          <div
            className="flex flex-col items-center justify-center h-full gap-4 py-8 cursor-pointer rounded-xl border-2 border-dashed transition-all"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            onClick={handleAddFiles}
          >
            <div
              className="rounded-2xl p-4 transition-all"
              style={{ background: "var(--bg-overlay)" }}
            >
              <FolderOpen className="h-7 w-7" style={{ color: "var(--primary)" }} />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Dateien hinzufügen
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Klicken oder Dateien hier ablegen
              </p>
            </div>
          </div>
        ) : (
          jobs.map((job) => <QueueItem key={job.id} job={job} />)
        )}
      </div>

      {/* Add button */}
      <div className="px-3 pb-3 pt-1">
        <button
          onClick={handleAddFiles}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all active:scale-[0.99] border"
          style={{
            background: "var(--primary-subtle)",
            borderColor: "var(--primary)",
            color: "var(--primary)",
          }}
        >
          <Plus className="h-4 w-4" />
          Dateien hinzufügen
        </button>
      </div>
    </div>
  );
}
