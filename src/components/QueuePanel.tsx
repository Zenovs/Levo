import { useQueueStore } from "../stores/queueStore";
import { useSettingsStore } from "../stores/settingsStore";
import { Button, Badge, Progress, Separator } from "./ui/index";
import {
  Plus,
  Trash2,
  CheckCheck,
  ArrowUp,
  ArrowDown,
  X,
  Film,
  Music,
  FileImage,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
} from "lucide-react";
import { cn, basename, formatDuration } from "../lib/utils";
import type { Job } from "../lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import { FORMATS } from "../lib/formats";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:   <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  running:   <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />,
  paused:    <PauseCircle className="h-3.5 w-3.5 text-yellow-400" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
  error:     <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
  cancelled: <X className="h-3.5 w-3.5 text-muted-foreground" />,
};

const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  pending:   "secondary",
  running:   "default",
  paused:    "warning",
  completed: "success",
  error:     "destructive",
  cancelled: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  pending:   "Wartend",
  running:   "Läuft",
  paused:    "Pausiert",
  completed: "Fertig",
  error:     "Fehler",
  cancelled: "Abgebrochen",
};

function fileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const fmt = FORMATS.find((f) => f.ext === ext);
  if (fmt?.type === "audio") return <Music className="h-4 w-4 text-purple-400" />;
  if (fmt?.type === "image") return <FileImage className="h-4 w-4 text-yellow-400" />;
  return <Film className="h-4 w-4 text-blue-400" />;
}

function QueueItem({ job }: { job: Job }) {
  const { selectedJobId, selectJob, removeJob, moveUp, moveDown } = useQueueStore();
  const isSelected = selectedJobId === job.id;

  return (
    <div
      className={cn(
        "group relative rounded-lg border p-3 cursor-pointer transition-colors select-none",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-transparent hover:border-border hover:bg-secondary/50"
      )}
      onClick={() => selectJob(job.id)}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">{fileIcon(job.fileName)}</div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={job.fileName}>
            {basename(job.fileName)}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            → {job.settings.outputFormat.toUpperCase()}
          </p>

          {job.status === "running" && job.progress && (
            <div className="mt-2 space-y-1">
              <Progress value={job.progress.percent} className="h-1.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(job.progress.percent)}%</span>
                <span>
                  {job.progress.speed > 0
                    ? `${job.progress.speed.toFixed(1)}x`
                    : ""}
                  {job.progress.etaSeconds != null
                    ? ` • ETA ${formatDuration(job.progress.etaSeconds)}`
                    : ""}
                </span>
              </div>
            </div>
          )}

          {job.status === "error" && (
            <p className="mt-1 text-xs text-destructive truncate" title={job.error ?? ""}>
              {job.error}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
          <Badge variant={STATUS_BADGE[job.status]}>
            <span className="flex items-center gap-1">
              {STATUS_ICONS[job.status]}
              <span className="hidden group-hover:inline">
                {STATUS_LABEL[job.status]}
              </span>
            </span>
          </Badge>
        </div>
      </div>

      {/* Hover actions */}
      <div
        className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => moveUp(job.id)}
          disabled={job.status === "running"}
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => moveDown(job.id)}
          disabled={job.status === "running"}
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => removeJob(job.id)}
          disabled={job.status === "running"}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function QueuePanel() {
  const { jobs, clearCompleted, clearAll } = useQueueStore();
  const { settings } = useSettingsStore();
  const { addFiles } = useQueueStore();

  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;

  async function handleAddFiles() {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Mediendateien",
            extensions: [
              "mp4", "mkv", "avi", "mov", "webm", "flv", "wmv", "ts", "m4v", "ogv",
              "mp3", "aac", "flac", "wav", "ogg", "m4a", "opus", "ac3",
              "gif", "png", "jpg",
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Warteschlange</h2>
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {completedCount > 0 && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={clearCompleted}
              title="Erledigte entfernen"
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </Button>
          )}
          {jobs.length > 0 && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={clearAll}
              title="Alle entfernen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Job List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {jobs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground py-8 cursor-pointer hover:text-foreground transition-colors"
            onClick={handleAddFiles}
          >
            <div className="rounded-full border-2 border-dashed border-border p-4">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium">Dateien hinzufügen</p>
              <p className="text-xs mt-1">Klicken oder hier ablegen</p>
            </div>
          </div>
        ) : (
          jobs.map((job) => <QueueItem key={job.id} job={job} />)
        )}
      </div>

      <Separator />

      {/* Footer: Add button */}
      <div className="px-3 py-2">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleAddFiles}
        >
          <Plus className="h-4 w-4" />
          Dateien hinzufügen
        </Button>
      </div>
    </div>
  );
}
