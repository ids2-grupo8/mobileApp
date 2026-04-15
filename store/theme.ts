import { create } from "zustand";

export type ThemeMode = "system" | "dark" | "light";

type ThemeStore = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const CYCLE: Record<ThemeMode, ThemeMode> = {
  system: "dark",
  dark: "light",
  light: "system",
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: "system",
  setMode: (mode) => set({ mode }),
  toggle: () => set({ mode: CYCLE[get().mode] }),
}));
