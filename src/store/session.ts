import { create } from "zustand";
import { api } from "@/lib/api";

type SessionState = {
  initialized: boolean;
  unlocked: boolean;
  restricted: boolean;
  theme: "light" | "dark";
  fontScale: number;
  loading: boolean;
  refresh: () => Promise<void>;
  setTheme: (t: "light" | "dark") => void;
  setFontScale: (s: number) => void;
};

export const useSession = create<SessionState>((set, get) => ({
  initialized: false,
  unlocked: false,
  restricted: false,
  theme: "light",
  fontScale: 1,
  loading: true,
  refresh: async () => {
    try {
      // Modo sem senha: o backend já abre a sessão na inicialização.
      const s = await api.status();
      set({ ...s, loading: false });
      const cfg = await api.settingsGet();
      const theme = cfg.theme === "dark" ? "dark" : "light";
      const fontScale = Number(cfg.font_scale) || 1;
      set({ theme, fontScale });
      applyAppearance(theme, fontScale);
    } catch {
      set({ loading: false });
    }
  },
  setTheme: (theme) => {
    set({ theme });
    applyAppearance(theme, get().fontScale);
    void api.settingsSet("theme", theme).catch(() => undefined);
  },
  setFontScale: (fontScale) => {
    set({ fontScale });
    applyAppearance(get().theme, fontScale);
    void api.settingsSet("font_scale", String(fontScale)).catch(() => undefined);
  },
}));

export function applyAppearance(theme: "light" | "dark", fontScale: number) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.setProperty("--font-base", `${Math.round(16 * fontScale)}px`);
}
