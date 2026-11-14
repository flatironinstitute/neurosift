/** Chart colors from the plot tokens, for code that draws on canvas or in a worker instead of with CSS. */
export interface PlotColors {
  surface: string;
  text: string;
  textMuted: string;
  gridMajor: string;
  gridMinor: string;
  mark: string;
  cursor: string;
  cursorFill: string;
  selectionFill: string;
  selectionStroke: string;
  series: string[];
  seriesOther: string;
}

const cache = new Map<string, PlotColors>();

/** The chart palette for a theme, read once from the plot tokens on a hidden probe element and kept. */
export const plotColors = (theme: "light" | "dark"): PlotColors => {
  const cached = cache.get(theme);
  if (cached) return cached;
  const probe = document.createElement("div");
  probe.dataset.plotTheme = theme;
  probe.hidden = true;
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const read = (name: string) => style.getPropertyValue(`--${name}`).trim();
  const colors: PlotColors = {
    surface: read("plot-surface"),
    text: read("plot-text"),
    textMuted: read("plot-text-muted"),
    gridMajor: read("plot-grid-major"),
    gridMinor: read("plot-grid-minor"),
    mark: read("plot-mark"),
    cursor: read("data-cursor"),
    cursorFill: read("plot-cursor-fill"),
    selectionFill: read("plot-selection-fill"),
    selectionStroke: read("plot-selection-stroke"),
    series: [1, 2, 3, 4, 5, 6].map((n) => read(`data-series-${n}`)),
    seriesOther: read("data-series-other"),
  };
  probe.remove();
  // Before the stylesheet loads every value is empty; don't keep that.
  if (colors.surface) cache.set(theme, colors);
  return colors;
};

const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: number[], b: number[]) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const toHex = (rgb: number[]) =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * A data color that reads on a chart background: unchanged when it already reaches 3:1, otherwise mixed toward white
 * (on dark) or black (on light) just far enough, so units and channels keep their hue in both chart themes.
 */
export const readableOn = (color: string, background: string): string => {
  if (!/^#[0-9a-f]{6}$/i.test(color) || !/^#[0-9a-f]{6}$/i.test(background))
    return color;
  const fg = channels(color);
  const bg = channels(background);
  if (contrast(fg, bg) >= 3) return color;
  const toward = luminance(bg) < 0.5 ? [255, 255, 255] : [0, 0, 0];
  for (let step = 1; step <= 20; step++) {
    const mixed = fg.map((v, i) => v + ((toward[i] - v) * step) / 20);
    if (contrast(mixed, bg) >= 3) return toHex(mixed);
  }
  return toHex(toward);
};
