/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useMemo } from "react";
import Plot from "react-plotly.js";
import { LoadedSweep } from "./useSweepData";

// Map NWB SI units to a display unit + scale factor. NWB stores values in SI
// after applying `conversion`, but in icephys the conventional units used in
// figures are mV and pA. If the file's unit string is already an offset unit
// (e.g. "millivolts"), we leave the data untouched.
function pickDisplayUnit(siUnit: string): { label: string; scale: number } {
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

interface Props {
  sweeps: LoadedSweep[];
  width: number;
  height: number;
  // "protocol": one legend entry per parent protocol (next narrowable tier).
  // "sweep": one legend entry per sweep.
  // "condition"/"repetition": "compare by" faceting — one entry per
  // experimental condition / repetition the sweep descended from.
  groupBy: "protocol" | "sweep" | "condition" | "repetition";
  // Compact mode for the small "Separate panels" view: drop the legend, tighten
  // margins, and shrink axis titles to bare units so they don't overlap in a
  // small panel.
  compact?: boolean;
}

const FamilyOverlayPlot: FunctionComponent<Props> = ({
  sweeps,
  width,
  height,
  groupBy,
  compact = false,
}) => {
  const { data, layout } = useMemo(() => {
    const data: any[] = [];

    // Pick display units from the first sweep (assumed consistent across sweeps).
    const respUnit = pickDisplayUnit(sweeps[0]?.response.unit ?? "");
    const stimUnit = pickDisplayUnit(sweeps[0]?.stimulus.unit ?? "");

    // Compute (groupId, groupLabel) per sweep and a stable ordering of groups
    // for color assignment. Honor the requested groupBy: "All" at the Protocol
    // tier shows Protocol categories even when there's only one protocol in
    // scope (user picked "All" explicitly; respect it). To see sweep-level
    // gradient on a single-protocol file, pick the Protocol specifically
    // rather than "All".
    type GroupInfo = { id: number; label: string };
    const groupOf = (sw: LoadedSweep): GroupInfo => {
      if (groupBy === "condition") {
        return {
          id: sw.condRow ?? -1,
          label:
            sw.condRow !== undefined
              ? `condition ${sw.condRow}`
              : "(no condition)",
        };
      }
      if (groupBy === "repetition") {
        return {
          id: sw.repRow ?? -1,
          label:
            sw.repRow !== undefined
              ? `repetition ${sw.repRow}`
              : "(no repetition)",
        };
      }
      if (groupBy === "protocol" && sw.seqRow !== undefined) {
        return {
          id: sw.seqRow,
          label: sw.protocolLabel || `seq ${sw.seqRow}`,
        };
      }
      return { id: sw.irtRow, label: `sweep ${sw.irtRow}` };
    };

    const groupOrder: number[] = [];
    const groupLabels = new Map<number, string>();
    for (const sw of sweeps) {
      const g = groupOf(sw);
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
        color = sequential(t);
      } else {
        color = categorical(i);
      }
      colorOfGroup.set(gid, color);
    });
    const legendShownFor = new Set<number>();

    sweeps.forEach((sw) => {
      const g = groupOf(sw);
      const color = colorOfGroup.get(g.id) || "#444";
      const showInLegend = !legendShownFor.has(g.id);
      if (showInLegend) legendShownFor.add(g.id);

      const respY =
        respUnit.scale === 1
          ? sw.response.y
          : Array.from(sw.response.y, (v) => v * respUnit.scale);
      const stimY =
        stimUnit.scale === 1
          ? sw.stimulus.y
          : Array.from(sw.stimulus.y, (v) => v * stimUnit.scale);
      const legendgroup = `g-${g.id}`;
      // X axis is in milliseconds (icephys convention).
      const respT = Array.from(sw.response.t, (s) => s * 1000);
      const stimT = Array.from(sw.stimulus.t, (s) => s * 1000);
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
    });

    const tickfont = compact ? { size: 8 } : undefined;
    const standoff = compact ? 3 : 8;
    const layout: any = {
      width,
      height,
      margin: compact
        ? { l: 40, r: 8, t: 6, b: 30 }
        : { l: 70, r: 20, t: 20, b: 50 },
      grid: { rows: 2, columns: 1, pattern: "independent" },
      xaxis: {
        domain: [0, 1],
        anchor: "y",
        showticklabels: false,
        showgrid: true,
      },
      yaxis: {
        domain: [0.28, 1],
        title: {
          text: compact ? respUnit.label : `response (${respUnit.label})`,
          standoff,
        },
        tickfont,
        showgrid: true,
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
      },
      showlegend: !compact,
      legend: {
        x: 1.02,
        y: 1,
        xanchor: "left",
        yanchor: "top",
        font: { size: 11 },
      },
      hovermode: "closest",
    };

    return { data, layout };
  }, [sweeps, width, height, groupBy, compact]);

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
