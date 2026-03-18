import { useThemeStore, type Theme } from "../stores/themeStore";
import { Moon, Sun, Palette } from "lucide-react";
import { cn } from "../lib/utils";

const THEMES: { id: Theme; label: string; icon: React.ReactNode; bg: string }[] = [
  {
    id: "dark",
    label: "Dark",
    icon: <Moon className="h-3.5 w-3.5" />,
    bg: "bg-[#0d1117]",
  },
  {
    id: "light",
    label: "Light",
    icon: <Sun className="h-3.5 w-3.5" />,
    bg: "bg-[#f6f8fa]",
  },
  {
    id: "color",
    label: "Color",
    icon: <Palette className="h-3.5 w-3.5" />,
    bg: "bg-[#1a0f2e]",
  },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: "var(--bg-overlay)" }}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          title={`${t.label} Mode`}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
            theme === t.id
              ? "text-white shadow-sm"
              : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
          )}
          style={
            theme === t.id
              ? { background: "var(--primary)", boxShadow: "0 1px 3px var(--primary-glow)" }
              : {}
          }
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
