export interface LegendItem {
  name: string;
  /** The data/series step, 1 to 6, so a group keeps its color in every view. Defaults to its position. */
  series?: number;
}

/** The swatch class for a series: its pinned step, else its position, past six the other color. */
export const swatchClass = (item: LegendItem, index: number) => {
  const step = item.series ?? index + 1;
  return `ns-legend-swatch ns-legend-swatch--${step >= 1 && step <= 6 ? step : "other"}`;
};
