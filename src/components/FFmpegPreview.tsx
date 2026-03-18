import { useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { useQueueStore } from "../stores/queueStore";
import { buildFFmpegCommand } from "../lib/ffmpegBuilder";
import { buildOutputPath } from "../lib/utils";
import { Button } from "./ui/index";
import { Terminal, Copy, ChevronDown, ChevronUp } from "lucide-react";

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
    } catch {
      // fallback
    }
  }

  return (
    <div className="border-t border-border bg-card/50">
      <div
        className="flex items-center gap-2 px-4 py-2 cursor-pointer select-none hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <Terminal className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground flex-1">FFmpeg-Befehl</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => { e.stopPropagation(); copyCommand(); }}
          title="Befehl kopieren"
        >
          <Copy className="h-3 w-3" />
        </Button>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-3">
          <pre className="text-xs font-mono text-green-400 bg-black/40 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
            {command}
          </pre>
          {copied && (
            <p className="text-xs text-primary mt-1">✓ In Zwischenablage kopiert</p>
          )}
        </div>
      )}
    </div>
  );
}
