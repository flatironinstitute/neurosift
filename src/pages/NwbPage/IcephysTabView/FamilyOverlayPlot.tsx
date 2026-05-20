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

// Viridis approximation as 8 evenly-spaced sample points. Plotly accepts a
// hex color per trace, so we map sweep index onto this discrete palette.
const VIRIDIS = [
  "#440154",
  "#482878",
  "#3e4989",
  "#31688e",
  "#26828e",
  "#1f9e89",
  "#35b779",
  "#6ece58",
  "#b5de2b",
  "#fde725",
];

function viridis(t: number): string {
  // t in [0,1]
  if (!isFinite(t) || t < 0) t = 0;
  if (t > 1) t = 1;
  const idx = Math.round(t * (VIRIDIS.length - 1));
  return VIRIDIS[idx];
}

interface Props {
  sweeps: LoadedSweep[];
  width: number;
  height: number;
}

const FamilyOverlayPlot: FunctionComponent<Props> = ({
  sweeps,
  width,
  height,
}) => {
  const { data, layout } = useMemo(() => {
    const n = sweeps.length;
    const data: any[] = [];

    // Pick display units from the first sweep (assumed consistent across sweeps).
    const respUnit = pickDisplayUnit(sweeps[0]?.response.unit ?? "");
    const stimUnit = pickDisplayUnit(sweeps[0]?.stimulus.unit ?? "");

    sweeps.forEach((sw, i) => {
      const color = viridis(n > 1 ? i / (n - 1) : 0);
      const respY =
        respUnit.scale === 1
          ? sw.response.y
          : Array.from(sw.response.y, (v) => v * respUnit.scale);
      const stimY =
        stimUnit.scale === 1
          ? sw.stimulus.y
          : Array.from(sw.stimulus.y, (v) => v * stimUnit.scale);
      data.push({
        x: Array.from(sw.response.t),
        y: Array.from(respY as any),
        type: "scatter",
        mode: "lines",
        line: { color, width: 1 },
        name: `sweep ${sw.irtRow}`,
        showlegend: false,
        xaxis: "x",
        yaxis: "y",
        hovertemplate: `sweep ${sw.irtRow}<br>t=%{x:.3f}s<br>y=%{y:.3g} ${respUnit.label}<extra></extra>`,
      });
      data.push({
        x: Array.from(sw.stimulus.t),
        y: Array.from(stimY as any),
        type: "scatter",
        mode: "lines",
        line: { color, width: 1 },
        name: `sweep ${sw.irtRow} (stim)`,
        showlegend: false,
        xaxis: "x2",
        yaxis: "y2",
        hovertemplate: `sweep ${sw.irtRow}<br>t=%{x:.3f}s<br>stim=%{y:.3g} ${stimUnit.label}<extra></extra>`,
      });
    });

    const layout: any = {
      width,
      height,
      margin: { l: 70, r: 20, t: 20, b: 50 },
      grid: { rows: 2, columns: 1, pattern: "independent" },
      xaxis: {
        domain: [0, 1],
        anchor: "y",
        showticklabels: false,
        showgrid: true,
      },
      yaxis: {
        domain: [0.28, 1],
        title: { text: `response (${respUnit.label})`, standoff: 8 },
        showgrid: true,
      },
      xaxis2: {
        domain: [0, 1],
        anchor: "y2",
        title: { text: "time within sweep (s)", standoff: 8 },
        matches: "x",
        showgrid: true,
      },
      yaxis2: {
        domain: [0, 0.22],
        title: { text: `stimulus (${stimUnit.label})`, standoff: 8 },
        showgrid: true,
      },
      showlegend: false,
      hovermode: "closest",
    };

    return { data, layout };
  }, [sweeps, width, height]);

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
