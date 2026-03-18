import { create } from "zustand";

export type Theme = "dark" | "light" | "color";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("ffmpegui-theme", theme);
}

const savedTheme = (localStorage.getItem("ffmpegui-theme") as Theme) || "dark";
applyTheme(savedTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: savedTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));
