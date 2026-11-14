/** Display themes, by the data-theme value tokens.css keys on. Light is the default and sets none. */
export type Theme = "light" | "dark" | "high-contrast";

/** index.html reads the same key before the first paint, so a saved theme never flashes light. */
export const THEME_KEY = "neurosiftTheme";

export const readTheme = (): Theme => {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "dark" || saved === "high-contrast" ? saved : "light";
};

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === "light") {
    delete root.dataset.theme;
    localStorage.removeItem(THEME_KEY);
  } else {
    root.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }
};
