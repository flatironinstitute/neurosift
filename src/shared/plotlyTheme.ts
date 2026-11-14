import type { Layout } from "plotly.js";
import type { PlotColors } from "./plotColors";

const axisKeys = (layout: object) =>
  Object.keys(layout).filter((key) => /^[xy]axis\d*$/.test(key));

const axisColors = (colors: PlotColors) => ({
  gridcolor: colors.gridMinor,
  linecolor: colors.gridMajor,
  zerolinecolor: colors.gridMajor,
  tickcolor: colors.gridMajor,
  tickfont: { color: colors.text },
  title: { font: { color: colors.text } },
});

/** Plotly layout overrides that draw a chart's chrome in the plot palette. */
export const plotlyTheme = (colors: PlotColors) => ({
  paper_bgcolor: colors.surface,
  plot_bgcolor: colors.surface,
  font: { color: colors.text },
  xaxis: axisColors(colors),
  yaxis: axisColors(colors),
  legend: { font: { color: colors.text } },
  hoverlabel: {
    bgcolor: colors.surface,
    bordercolor: colors.gridMajor,
    font: { color: colors.text },
  },
  modebar: {
    bgcolor: "rgba(0,0,0,0)",
    color: colors.textMuted,
    activecolor: colors.text,
  },
});

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const merge = (base: unknown, over: unknown): unknown => {
  if (!isObject(base) || !isObject(over))
    return over === undefined ? base : over;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(over)) out[key] = merge(base[key], over[key]);
  return out;
};

/** A chart's own layout with the themed chrome underneath it: the chart's explicit settings win, every axis gets the palette. */
export const themedLayout = <T extends Partial<Layout>>(
  colors: PlotColors,
  layout: T,
): Partial<Layout> => {
  const theme: Record<string, unknown> = plotlyTheme(colors);
  for (const key of axisKeys(layout)) theme[key] = axisColors(colors);
  return merge(theme, layout) as Partial<Layout>;
};
