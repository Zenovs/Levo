import { useSettingsStore } from "../stores/settingsStore";
import { PRESETS } from "../lib/presets";
import { Globe, Music, Minimize2, Monitor, Sparkles, Waves } from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  Globe:    <Globe className="h-3.5 w-3.5" />,
  Music:    <Music className="h-3.5 w-3.5" />,
  Minimize2: <Minimize2 className="h-3.5 w-3.5" />,
  Monitor:  <Monitor className="h-3.5 w-3.5" />,
  Sparkles: <Sparkles className="h-3.5 w-3.5" />,
  Waves:    <Waves className="h-3.5 w-3.5" />,
};

export function PresetBar() {
  const { applyPreset, settings } = useSettingsStore();

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-b"
      style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
    >
      <span className="section-header shrink-0">Presets</span>
      <div className="flex gap-1.5">
        {PRESETS.map((preset) => {
          const isActive = settings.outputFormat === preset.settings.outputFormat &&
            (!preset.settings.videoSettings?.codec ||
              settings.videoSettings.codec === preset.settings.videoSettings?.codec);
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.settings)}
              title={preset.description}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.97]"
              style={
                isActive
                  ? { background: "var(--primary)", color: "white", boxShadow: "0 1px 6px var(--primary-glow)" }
                  : { background: "var(--bg-overlay)", color: "var(--text-muted)", border: "1px solid var(--border)" }
              }
            >
              {ICON_MAP[preset.icon]}
              {preset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
