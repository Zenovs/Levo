import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueueStore } from "../stores/queueStore";
import { useSettingsStore } from "../stores/settingsStore";
import { Upload } from "lucide-react";
import { cn } from "../lib/utils";

interface DropZoneProps {
  children: React.ReactNode;
}

export function DropZone({ children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { addFiles } = useQueueStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    // Tauri 2 native drag-drop events — give us real file system paths
    const unlistenDrop = listen<{ paths: string[] }>("tauri://drag-drop", (ev) => {
      setIsDragging(false);
      const paths = ev.payload.paths.filter(Boolean);
      if (paths.length > 0) {
        addFiles(paths, settings);
      }
    });

    const unlistenEnter = listen("tauri://drag-enter", () => setIsDragging(true));
    const unlistenLeave = listen("tauri://drag-leave", () => setIsDragging(false));

    return () => {
      unlistenDrop.then((fn) => fn());
      unlistenEnter.then((fn) => fn());
      unlistenLeave.then((fn) => fn());
    };
  }, [addFiles, settings]);

  // Keep web drag-over to set the cursor correctly
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div
      className={cn("relative flex flex-col h-full w-full transition-colors duration-150", {
        "ring-2 ring-inset": isDragging,
      })}
      style={isDragging ? { "--tw-ring-color": "var(--primary)" } as React.CSSProperties : {}}
      onDragOver={handleDragOver}
    >
      {children}

      {isDragging && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 pointer-events-none"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="rounded-full border-2 border-dashed p-6 animate-pulse"
            style={{ borderColor: "var(--primary)" }}
          >
            <Upload className="h-8 w-8" style={{ color: "var(--primary)" }} />
          </div>
          <p className="text-lg font-semibold" style={{ color: "var(--primary)" }}>
            Dateien hier ablegen
          </p>
        </div>
      )}
    </div>
  );
}
