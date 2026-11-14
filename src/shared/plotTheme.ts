import { useSyncExternalStore } from "react";
import { plotColors } from "./plotColors";

/** How charts are drawn: Match theme follows the app theme; Light and Dark hold whatever the app theme. */
export type PlotThemeChoice = "auto" | "light" | "dark";
export type PlotTheme = "light" | "dark";

/** The chart choices as Settings and the Display menu offer them. */
export const PLOT_THEME_OPTIONS: { value: PlotThemeChoice; label: string }[] = [
  { value: "auto", label: "Match theme" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const KEY = "neurosiftPlotTheme";
const listeners = new Set<() => void>();

export const readPlotTheme = (): PlotThemeChoice => {
  const saved = localStorage.getItem(KEY);
  return saved === "light" || saved === "dark" ? saved : "auto";
};

/** Every chart shares one choice, so flipping one chart flips them all. */
export const setPlotTheme = (choice: PlotThemeChoice) => {
  if (choice === "auto") localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, choice);
  listeners.forEach((notify) => notify());
};

export const resolvePlotTheme = (choice: PlotThemeChoice): PlotTheme =>
  choice !== "auto"
    ? choice
    : document.documentElement.dataset.theme
      ? "dark"
      : "light";

// The app theme lives on <html data-theme>, so Match theme also listens for that attribute.
const subscribe = (notify: () => void) => {
  listeners.add(notify);
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
  });
  return () => {
    listeners.delete(notify);
    observer.disconnect();
  };
};

/** The theme charts draw in now, and the setter their Light/Dark switch calls. */
export const usePlotTheme = () => {
  const theme = useSyncExternalStore(subscribe, () =>
    resolvePlotTheme(readPlotTheme()),
  );
  return { plotTheme: theme, onPlotThemeChange: setPlotTheme };
};

/** The choice itself, for Settings, where Match theme can be picked again. */
export const usePlotThemeChoice = () =>
  useSyncExternalStore(subscribe, readPlotTheme);

/** The palette canvas and worker drawing uses, in the charts' current theme. */
export const usePlotColors = () => plotColors(usePlotTheme().plotTheme);
