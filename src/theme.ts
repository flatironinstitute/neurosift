import { useSyncExternalStore } from "react";

/** The theme people choose; System follows the computer's dark mode and contrast settings. */
export type ThemeChoice = "light" | "dark" | "high-contrast" | "system";
/** A theme as drawn, by the data-theme value tokens.css keys on. Light is the default and sets none. */
export type Theme = Exclude<ThemeChoice, "system">;

/** index.html reads the same key before the first paint, so a saved theme never flashes light. */
export const THEME_KEY = "neurosiftTheme";

/** The choices as Settings and the Display menu offer them. */
export const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "high-contrast", label: "High contrast" },
  { value: "system", label: "Match system" },
];

const CHOICES = THEME_OPTIONS.map((option) => option.value);
const MORE_CONTRAST = "(prefers-contrast: more)";
const DARK = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

export const readTheme = (): ThemeChoice => {
  const saved = localStorage.getItem(THEME_KEY) as ThemeChoice | null;
  return saved && CHOICES.includes(saved) ? saved : "light";
};

export const resolveTheme = (choice: ThemeChoice): Theme => {
  if (choice !== "system") return choice;
  if (window.matchMedia?.(MORE_CONTRAST).matches) return "high-contrast";
  return window.matchMedia?.(DARK).matches ? "dark" : "light";
};

const draw = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === "light") delete root.dataset.theme;
  else root.dataset.theme = theme;
};

export const applyTheme = (choice: ThemeChoice) => {
  if (choice === "light") localStorage.removeItem(THEME_KEY);
  else localStorage.setItem(THEME_KEY, choice);
  draw(resolveTheme(choice));
  listeners.forEach((notify) => notify());
};

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

/** The saved choice, shared by Settings and the app bar's Display menu. */
export const useThemeChoice = () => useSyncExternalStore(subscribe, readTheme);

/** Redraws when the computer's settings change while System is chosen. Returns a function that stops watching. */
export const watchSystemTheme = () => {
  const queries = [MORE_CONTRAST, DARK].map((q) => window.matchMedia?.(q));
  const update = () => {
    if (readTheme() === "system") draw(resolveTheme("system"));
  };
  queries.forEach((q) => q?.addEventListener("change", update));
  return () => queries.forEach((q) => q?.removeEventListener("change", update));
};
