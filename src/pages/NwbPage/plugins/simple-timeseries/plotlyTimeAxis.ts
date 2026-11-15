import type { AxisInsets } from "@shared/context-timeseries-selection-2";

type AxisLayout = { _offset?: number; _length?: number };
type FullLayout = {
  width?: number;
  height?: number;
  xaxis?: AxisLayout;
  yaxis?: AxisLayout;
};

/** The margins around a drawn Plotly plot's data area, which a legend widens. */
export const plotInsets = (graph: HTMLElement): AxisInsets | undefined => {
  const full = (graph as HTMLElement & { _fullLayout?: FullLayout })
    ._fullLayout;
  const x = full?.xaxis;
  const y = full?.yaxis;
  if (
    !full?.width ||
    !full.height ||
    x?._offset === undefined ||
    x._length === undefined ||
    y?._offset === undefined ||
    y._length === undefined
  )
    return undefined;
  return {
    left: x._offset,
    right: full.width - x._offset - x._length,
    top: y._offset,
    bottom: full.height - y._offset - y._length,
  };
};

/** The new time range from a Plotly relayout event after a pan, if it has one. */
export const panRange = (
  event: Record<string, unknown>,
): [number, number] | undefined => {
  const pair = event["xaxis.range"];
  const [a, b] = Array.isArray(pair)
    ? pair
    : [event["xaxis.range[0]"], event["xaxis.range[1]"]];
  return typeof a === "number" && typeof b === "number" && b > a
    ? [a, b]
    : undefined;
};
