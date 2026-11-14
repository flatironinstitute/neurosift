import { readableOn, type PlotColors } from "./plotColors";

/** The trace colors timeseries views have always used (matplotlib's tab10, first eight). */
export const TRACE_COLORS = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
];

/** Trace colors for a chart's theme: unchanged on light, lightened only where needed on dark. */
export const traceColors = (colors: PlotColors, dark: boolean) =>
  dark ? TRACE_COLORS.map((c) => readableOn(c, colors.surface)) : TRACE_COLORS;
