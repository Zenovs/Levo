import { useCallback, useState } from "react";
import { useQueueStore } from "../stores/queueStore";
import { useSettingsStore } from "../stores/settingsStore";
import { Upload } from "lucide-react";
import { cn } from "../lib/utils";

interface DropZoneProps {
  children: React.ReactNode;
}

export function DropZone({ children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCount, setDragCount] = useState(0);
  const { addFiles } = useQueueStore();
  const { settings } = useSettingsStore();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCount((c) => c + 1);
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCount((c) => {
      const next = c - 1;
      if (next <= 0) setIsDragging(false);
      return Math.max(0, next);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCount(0);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // Use file.path which is available in Tauri context
      const paths = files
        .map((f) => (f as File & { path?: string }).path ?? "")
        .filter(Boolean);

      if (paths.length > 0) {
        addFiles(paths, settings);
      }
    },
    [addFiles, settings]
  );

  return (
    <div
      className={cn("relative flex flex-col h-full w-full transition-colors duration-150", {
        "ring-2 ring-primary ring-inset": isDragging,
      })}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="rounded-full border-2 border-dashed border-primary p-6 animate-pulse">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg font-semibold text-primary">Dateien hier ablegen</p>
        </div>
      )}
    </div>
  );
}
