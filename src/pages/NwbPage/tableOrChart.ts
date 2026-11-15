const TABLE_PLUGIN = "dynamic-table";

/** The views that show a table's rows as a chart, and the switch option for each. */
const CHART_PLUGINS: { [plugin: string]: { value: string; label: string } } = {
  TimeIntervals: { value: "intervals", label: "Intervals" },
  Raster: { value: "raster", label: "Raster" },
};

export type TableOrChart = {
  options: { value: string; label: string }[];
  defaultView: string;
  shown: string;
  /** Plugin names, by option value. */
  plugins: { [value: string]: string };
};

/** A Table or chart switch for an object with both views: the chart in a combined tab, the table in its own. */
export const findTableOrChart = (
  pluginNames: string[],
  inMultiView: boolean,
  storedView: string | undefined,
): TableOrChart | undefined => {
  if (!pluginNames.includes(TABLE_PLUGIN)) return undefined;
  const chartPlugin = pluginNames.find((name) => name in CHART_PLUGINS);
  if (!chartPlugin) return undefined;
  const chart = CHART_PLUGINS[chartPlugin];
  const options = [{ value: "table", label: "Table" }, chart];
  const defaultView = inMultiView ? chart.value : "table";
  const shown = options.some((o) => o.value === storedView)
    ? storedView!
    : defaultView;
  return {
    options,
    defaultView,
    shown,
    plugins: { table: TABLE_PLUGIN, [chart.value]: chartPlugin },
  };
};

export const hiddenPlugin = (pair: TableOrChart) =>
  pair.plugins[pair.options.find((o) => o.value !== pair.shown)!.value];

/** What goes in the link: nothing for the default, so links stay short. */
export const viewToStore = (pair: TableOrChart, view: string) =>
  view === pair.defaultView ? undefined : view;
