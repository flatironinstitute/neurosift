/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useMemo } from "react";
import Plot from "react-plotly.js";
import { internId, shadesOf } from "./palette";
import { LoadedSweep } from "./useSweepData";

// Map NWB SI units to a display unit + scale factor. NWB stores values in SI
// after applying `conversion`, but in icephys the conventional units used in
// figures are mV and pA. If the file's unit string is already an offset unit
// (e.g. "millivolts"), we leave the data untouched.
export function pickDisplayUnit(siUnit: string): {
  label: string;
  scale: number;
} {
  const u = siUnit.toLowerCase().trim();
  if (u === "volts" || u === "v") return { label: "mV", scale: 1e3 };
  if (u === "amperes" || u === "ampere" || u === "a")
    return { label: "pA", scale: 1e12 };
  // already-scaled units pass through
  if (u === "millivolts" || u === "mv") return { label: "mV", scale: 1 };
  if (u === "picoamperes" || u === "pa") return { label: "pA", scale: 1 };
  if (u === "nanoamperes" || u === "na") return { label: "nA", scale: 1 };
  // unknown unit: pass through, no scale
  return { label: siUnit || "(arb)", scale: 1 };
}

// Sequential palette (ColorBrewer single-hue Blues, 9-class with the
// lightest stop dropped to keep traces visible on a white background).
// Used for ordered groups (sweep index within a Protocol). Matches the
// app's blue accent color and follows the classic icephys-paper look.
const BLUES = [
  "#deebf7",
  "#c6dbef",
  "#9ecae1",
  "#6baed6",
  "#4292c6",
  "#2171b5",
  "#08519c",
  "#08306b",
];

function sequential(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  if (t > 1) t = 1;
  const idx = Math.round(t * (BLUES.length - 1));
  return BLUES[idx];
}

// Categorical palette (Okabe-Ito) for unordered groups (Protocol identity).
// Designed by Okabe & Ito to be distinguishable for all common color-vision
// deficiencies. We drop pure black to keep contrast vs the plot background.
const OKABE_ITO = [
  "#E69F00", // orange
  "#56B4E9", // sky blue
  "#009E73", // bluish green
  "#F0E442", // yellow
  "#0072B2", // blue
  "#D55E00", // vermilion
  "#CC79A7", // reddish purple
  "#000000", // black
];

function categorical(i: number): string {
  return OKABE_ITO[
    ((i % OKABE_ITO.length) + OKABE_ITO.length) % OKABE_ITO.length
  ];
}

export type GroupBy =
  | "protocol"
  | "sweep"
  | "condition"
  | "repetition"
  | "electrode"
  | "cell"
  // A custom intracellular_recordings column axis, encoded as "col:<name>".
  // `(string & {})` keeps autocomplete for the built-ins while accepting these.
  | (string & {});

// Stable (id, label) for a sweep under a grouping axis. The ids are global
// (condRow/repRow/seqRow, or internId for string axes), so the same group maps
// to the same id across panels — which lets a shared legend's colors match.
export function groupOf(
  sw: LoadedSweep,
  groupBy: GroupBy,
): { id: number; label: string } {
  if (groupBy === "condition")
    return {
      id: sw.condRow ?? -1,
      label:
        sw.condRow !== undefined ? `condition ${sw.condRow}` : "(no condition)",
    };
  if (groupBy === "repetition")
    return {
      id: sw.repRow ?? -1,
      label:
        sw.repRow !== undefined ? `repetition ${sw.repRow}` : "(no repetition)",
    };
  if (groupBy === "electrode")
    return {
      id: internId(sw.electrode ?? "?"),
      label: sw.electrode ?? "(no electrode)",
    };
  if (groupBy === "cell")
    return {
      id: internId("cell:" + (sw.cell ?? "?")),
      label: sw.cell ?? "(no cell)",
    };
  if (groupBy === "protocol" && sw.seqRow !== undefined) {
    // Key by protocol name, not seqRow: the same protocol run across several
    // sequential recordings (i.e. repetitions) should share one color and one
    // legend entry, not get a fresh color per recording.
    const name = sw.protocolLabel || `seq ${sw.seqRow}`;
    return { id: internId("p:" + name), label: name };
  }
  if (groupBy.startsWith("col:")) {
    // Custom intracellular_recordings column: group by its per-sweep value.
    const colName = groupBy.slice(4);
    const v = sw.custom?.[colName];
    return { id: internId(groupBy + "=" + (v ?? "?")), label: v ?? "(none)" };
  }
  return { id: sw.irtRow, label: `sweep ${sw.irtRow}` };
}

interface Props {
  sweeps: LoadedSweep[];
  width: number;
  height: number;
  // "protocol": one legend entry per parent protocol (next narrowable tier).
  // "sweep": one legend entry per sweep.
  // "condition"/"repetition": "compare by" faceting — one entry per
  // experimental condition / repetition the sweep descended from.
  groupBy: GroupBy;
  // Shared categorical color map (group id -> color), so faceted panels and the
  // shared legend agree on colors. Used only for categorical groupings; the
  // per-sweep gradient ignores it. Falls back to local categorical() if absent.
  groupColors?: Map<number, string>;
  // Compact mode for the small "Separate panels" view: drop the legend, tighten
  // margins, and shrink axis titles to bare units so they don't overlap in a
  // small panel.
  compact?: boolean;
  // When set with groupBy="sweep", the per-sweep gradient is built as shades of
  // this base hue instead of the default Blues — used by Separate panels so each
  // panel's gradient matches that group's categorical color.
  baseColor?: string;
  // Crop the within-sweep x-axis to this [startMs, endMs] window (display only).
  // The stimulus axis follows via `matches: "x"`. Null/undefined = autorange.
  xRangeMs?: [number, number] | null;
  // Fixed y-range per display unit (e.g. { mV: [..], pA: [..] }) so faceted
  // panels share a common y-scale. The response axis uses the entry for its
  // unit, the stimulus axis the entry for its unit. Absent unit = autorange.
  // Not locked (no `fixedrange`), so the user can still zoom/double-click.
  yRangeByUnit?: Record<string, [number, number]>;
}

const FamilyOverlayPlot: FunctionComponent<Props> = ({
  sweeps,
  width,
  height,
  groupBy,
  groupColors,
  compact = false,
  baseColor,
  xRangeMs,
  yRangeByUnit,
}) => {
  const { data, layout } = useMemo(() => {
    const data: any[] = [];

    // Pick display units from the first sweep (assumed consistent across sweeps).
    const respUnit = pickDisplayUnit(sweeps[0]?.response.unit ?? "");
    // IZeroClamp (zero-current clamp) sweeps have no stimulus. When every sweep
    // in the family is stimulus-less, render a single response-only panel rather
    // than a bogus "stimulus" panel duplicating the response.
    const noStimulus =
      sweeps.length > 0 && sweeps.every((sw) => sw.noStimulus || !sw.stimulus);
    const stimUnit = pickDisplayUnit(
      sweeps.find((sw) => sw.stimulus)?.stimulus?.unit ?? "",
    );

    // Compute (groupId, groupLabel) per sweep and a stable ordering of groups
    // for color assignment. Honor the requested groupBy: "All" at the Protocol
    // tier shows Protocol categories even when there's only one protocol in
    // scope (user picked "All" explicitly; respect it). To see sweep-level
    // gradient on a single-protocol file, pick the Protocol specifically
    // rather than "All".
    const gOf = (sw: LoadedSweep) => groupOf(sw, groupBy);

    const groupOrder: number[] = [];
    const groupLabels = new Map<number, string>();
    for (const sw of sweeps) {
      const g = gOf(sw);
      if (!groupLabels.has(g.id)) {
        groupOrder.push(g.id);
        groupLabels.set(g.id, g.label);
      }
    }
    // For the sequential (Blues) palette, compress the sample positions
    // toward the saturated (dark) end when there are few sweeps, so the
    // lightest sample doesn't disappear against the white background. For
    // larger families (N >= 5) use the full range to maximize hue spread.
    const N = groupOrder.length;
    const tMin = Math.max(0, (5 - N) / 10);
    const colorOfGroup = new Map<number, string>();
    groupOrder.forEach((gid, i) => {
      let color: string;
      if (groupBy === "sweep") {
        const u = N > 1 ? i / (N - 1) : 0;
        const t = tMin + u * (1 - tMin);
        color = baseColor ? shadesOf(baseColor, t) : sequential(t);
      } else {
        // Prefer the shared (cross-panel) color map so faceted panels and the
        // shared legend agree; fall back to local order.
        color = groupColors?.get(gid) ?? categorical(i);
      }
      colorOfGroup.set(gid, color);
    });
    const legendShownFor = new Set<number>();

    sweeps.forEach((sw) => {
      const g = gOf(sw);
      const color = colorOfGroup.get(g.id) || "#444";
      const showInLegend = !legendShownFor.has(g.id);
      if (showInLegend) legendShownFor.add(g.id);

      const respY =
        respUnit.scale === 1
          ? sw.response.y
          : Array.from(sw.response.y, (v) => v * respUnit.scale);
      const legendgroup = `g-${g.id}`;
      // X axis is in milliseconds (icephys convention).
      const respT = Array.from(sw.response.t, (s) => s * 1000);
      data.push({
        x: respT,
        y: Array.from(respY as any),
        type: "scatter",
        mode: "lines",
        line: { color, width: 1 },
        name: g.label,
        legendgroup,
        showlegend: showInLegend,
        xaxis: "x",
        yaxis: "y",
        hovertemplate: `${g.label}<br>sweep ${sw.irtRow}<br>t=%{x:.1f} ms<br>y=%{y:.3g} ${respUnit.label}<extra></extra>`,
      });
      if (!noStimulus && sw.stimulus) {
        const stimY =
          stimUnit.scale === 1
            ? sw.stimulus.y
            : Array.from(sw.stimulus.y, (v) => v * stimUnit.scale);
        const stimT = Array.from(sw.stimulus.t, (s) => s * 1000);
        data.push({
          x: stimT,
          y: Array.from(stimY as any),
          type: "scatter",
          mode: "lines",
          line: { color, width: 1 },
          name: g.label,
          legendgroup,
          showlegend: false,
          xaxis: "x2",
          yaxis: "y2",
          hovertemplate: `${g.label}<br>sweep ${sw.irtRow}<br>t=%{x:.1f} ms<br>stim=%{y:.3g} ${stimUnit.label}<extra></extra>`,
        });
      }
    });

    const tickfont = compact ? { size: 8 } : undefined;
    const standoff = compact ? 3 : 8;
    const margin = compact
      ? { l: 40, r: 8, t: 6, b: 30 }
      : { l: 70, r: 20, t: 20, b: 50 };
    const legend = {
      x: 1.02,
      y: 1,
      xanchor: "left",
      yanchor: "top",
      font: { size: 11 },
    };
    // Within-sweep x-window crop (display only). Applied to the primary x-axis;
    // the stimulus x-axis follows via `matches: "x"`.
    const xr = xRangeMs ? { range: xRangeMs, autorange: false } : {};
    // Fixed (shared-across-facets) y-range per unit. Set `range` only, not
    // `fixedrange`, so the user can still box-zoom / double-click each panel.
    const yrResp = yRangeByUnit?.[respUnit.label];
    const yrStim = yRangeByUnit?.[stimUnit.label];
    const yResp = yrResp ? { range: yrResp, autorange: false } : {};
    const yStim = yrStim ? { range: yrStim, autorange: false } : {};
    // No-stimulus families (IZeroClamp) get a single response panel filling the
    // height, with the time axis on the response plot itself.
    const layout: any = noStimulus
      ? {
          width,
          height,
          margin,
          xaxis: {
            domain: [0, 1],
            anchor: "y",
            title: {
              text: compact ? "ms" : "time within sweep (ms)",
              standoff,
            },
            tickfont,
            showgrid: true,
            ...xr,
          },
          yaxis: {
            domain: [0, 1],
            title: {
              text: compact ? respUnit.label : `response (${respUnit.label})`,
              standoff,
            },
            tickfont,
            showgrid: true,
            ...yResp,
          },
          showlegend: !compact,
          legend,
          hovermode: "closest",
        }
      : {
          width,
          height,
          margin,
          grid: { rows: 2, columns: 1, pattern: "independent" },
          xaxis: {
            domain: [0, 1],
            anchor: "y",
            showticklabels: false,
            showgrid: true,
            ...xr,
          },
          yaxis: {
            domain: [0.28, 1],
            title: {
              text: compact ? respUnit.label : `response (${respUnit.label})`,
              standoff,
            },
            tickfont,
            showgrid: true,
            ...yResp,
          },
          xaxis2: {
            domain: [0, 1],
            anchor: "y2",
            title: {
              text: compact ? "ms" : "time within sweep (ms)",
              standoff,
            },
            tickfont,
            matches: "x",
            showgrid: true,
          },
          yaxis2: {
            domain: [0, 0.22],
            title: {
              text: compact ? stimUnit.label : `stimulus (${stimUnit.label})`,
              standoff,
            },
            tickfont,
            showgrid: true,
            ...yStim,
          },
          showlegend: !compact,
          legend,
          hovermode: "closest",
        };

    return { data, layout };
  }, [
    sweeps,
    width,
    height,
    groupBy,
    groupColors,
    compact,
    baseColor,
    xRangeMs,
    yRangeByUnit,
  ]);

  if (sweeps.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width,
          height,
          color: "#888",
        }}
      >
        Pick a protocol to render its sweep family.
      </div>
    );
  }

  return (
    <Plot
      data={data}
      layout={layout}
      config={{ responsive: true, displayModeBar: false }}
    />
  );
};

export default FamilyOverlayPlot;
