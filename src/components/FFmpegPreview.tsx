import { useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { useQueueStore } from "../stores/queueStore";
import { buildFFmpegCommand } from "../lib/ffmpegBuilder";
import { buildOutputPath } from "../lib/utils";
import { Terminal, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

export function FFmpegPreview() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { settings } = useSettingsStore();
  const { jobs, selectedJobId } = useQueueStore();

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const inputPath = selectedJob?.inputPath ?? "/path/to/input.mp4";
  const outputPath = buildOutputPath(
    inputPath,
    settings.outputDir,
    settings.outputFileSuffix,
    settings.outputFormat
  );
  const command = buildFFmpegCommand(inputPath, outputPath, settings);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  }

  return (
    <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      {/* Toggle row */}
      <div
        className="flex items-center gap-2 px-4 py-2 cursor-pointer select-none transition-colors"
        style={{ color: "var(--text-muted)" }}
        onClick={() => setExpanded((e) => !e)}
      >
        <Terminal className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
        <span className="text-xs font-semibold flex-1" style={{ color: "var(--text-secondary)" }}>
          FFmpeg-Befehl
        </span>
        {/* Inline preview when collapsed */}
        {!expanded && (
          <span
            className="font-mono text-xs truncate max-w-xs hidden md:block"
            style={{ color: "var(--text-muted)" }}
          >
            {command.slice(0, 80)}{command.length > 80 ? "…" : ""}
          </span>
        )}
        <button
          className="rounded-lg p-1.5 transition-colors hover:bg-[color:var(--bg-overlay)]"
          onClick={(e) => { e.stopPropagation(); copyCommand(); }}
          title="Befehl kopieren"
        >
          {copied
            ? <Check className="h-3.5 w-3.5" style={{ color: "var(--success)" }} />
            : <Copy className="h-3.5 w-3.5" />
          }
        </button>
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronUp className="h-3.5 w-3.5" />
        }
      </div>

      {/* Expanded area */}
      {expanded && (
        <div className="px-4 pb-3">
          <pre
            className="font-mono text-xs rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed"
            style={{ background: "var(--bg-base)", color: "#7ee787", border: "1px solid var(--border)" }}
          >
            {command}
          </pre>
          {copied && (
            <p className="text-xs mt-1.5" style={{ color: "var(--success)" }}>
              ✓ In Zwischenablage kopiert
            </p>
          )}
        </div>
      )}
    </div>
  );
}
