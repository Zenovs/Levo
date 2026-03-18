import { useSettingsStore } from "../stores/settingsStore";
import { PRESETS } from "../lib/presets";
import { Globe, Music, Minimize2, Monitor, Sparkles, Waves } from "lucide-react";
import { cn } from "../lib/utils";

const ICON_MAP: Record<string, React.ReactNode> = {
  Globe: <Globe className="h-4 w-4" />,
  Music: <Music className="h-4 w-4" />,
  Minimize2: <Minimize2 className="h-4 w-4" />,
  Monitor: <Monitor className="h-4 w-4" />,
  Sparkles: <Sparkles className="h-4 w-4" />,
  Waves: <Waves className="h-4 w-4" />,
};

export function PresetBar() {
  const { applyPreset, settings } = useSettingsStore();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-4 py-2 border-b border-border">
      <span className="text-xs text-muted-foreground shrink-0 self-center mr-1">Schnell-Presets:</span>
      {PRESETS.map((preset) => {
        const isActive =
          settings.outputFormat === preset.settings.outputFormat &&
          (!preset.settings.videoSettings?.codec ||
            settings.videoSettings.codec === preset.settings.videoSettings.codec);
        return (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset.settings)}
            title={preset.description}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors shrink-0",
              isActive
                ? "border-primary bg-primary/20 text-primary"
                : "border-border hover:border-primary/50 hover:bg-secondary/50"
            )}
          >
            {ICON_MAP[preset.icon] ?? null}
            {preset.name}
          </button>
        );
      })}
    </div>
  );
}
