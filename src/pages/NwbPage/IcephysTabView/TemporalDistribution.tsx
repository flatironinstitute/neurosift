import { FunctionComponent, useMemo, useState } from "react";
import { colorsForGroups, internId } from "./palette";
import { SweepTime } from "./useSweepTimes";

interface Props {
  // Current selection (drawn highlighted, colored to match the family overlay).
  times: SweepTime[];
  // Every sweep in the session (drawn as a faint gray backdrop for context).
  contextTimes: SweepTime[];
  loading: boolean;
  width: number;
  // Match the family overlay's grouping so colors agree across views.
  groupBy: "protocol" | "sweep" | "condition" | "repetition" | "electrode";
  // The Panels axis: also separates the timeline into lanes, so setting Panels
  // by (not just Color by) is reflected here.
  panelsBy: "none" | "protocol" | "condition" | "repetition" | "electrode";
}

type Axis = "protocol" | "sweep" | "condition" | "repetition" | "electrode";

// Stable string key for a sweep's group under a given axis (for lane grouping).
function idForAxis(t: SweepTime, axis: Axis): string {
  if (axis === "condition") return `c${t.condRow ?? -1}`;
  if (axis === "repetition") return `r${t.repRow ?? -1}`;
  if (axis === "electrode") return `e${t.electrode ?? "?"}`;
  if (axis === "protocol") return `p${t.protocolLabel ?? `seq ${t.seqRow}`}`;
  return `s${t.irtRow}`;
}

const HEIGHT = 84;
const MARGIN_L = 12;
const MARGIN_R = 16;
const AXIS_H = 30;
const HEADER_H = 20;

function fmtClock(sec: number): string {
  if (!isFinite(sec)) return "?";
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

// ~5 evenly spaced axis ticks across [t0, t1].
function axisTicks(t0: number, t1: number): number[] {
  const span = t1 - t0;
  if (span <= 0) return [t0];
  const out: number[] = [];
  for (let i = 0; i <= 5; i++) out.push(t0 + (span * i) / 5);
  return out;
}

const TemporalDistribution: FunctionComponent<Props> = ({
  times,
  contextTimes,
  loading,
  width,
  groupBy,
  panelsBy,
}) => {
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // Selection model: color per group (matches the family overlay) + summary.
  const sel = useMemo(() => {
    if (times.length === 0) return null;
    const order: number[] = [];
    const labelOf = new Map<number, string>();
    const idOf = (t: SweepTime) => {
      if (groupBy === "condition") return t.condRow ?? -1;
      if (groupBy === "repetition") return t.repRow ?? -1;
      if (groupBy === "electrode") return internId(t.electrode ?? "?");
      if (groupBy === "protocol") return t.seqRow ?? -1;
      return t.irtRow;
    };
    const labelFor = (t: SweepTime) => {
      if (groupBy === "condition")
        return t.condRow !== undefined ? `condition ${t.condRow}` : "(none)";
      if (groupBy === "repetition")
        return t.repRow !== undefined ? `repetition ${t.repRow}` : "(none)";
      if (groupBy === "electrode") return t.electrode ?? "(no electrode)";
      if (groupBy === "protocol") return t.protocolLabel || `seq ${t.seqRow}`;
      return `sweep ${t.irtRow}`;
    };
    for (const t of times) {
      const id = idOf(t);
      const label = labelFor(t);
      if (!labelOf.has(id)) {
        order.push(id);
        labelOf.set(id, label);
      }
    }
    return {
      idOf,
      labelOf,
      colorOf: colorsForGroups(order, groupBy),
      t0: Math.min(...times.map((t) => t.startSec)),
      latest: Math.max(...times.map((t) => t.startSec)),
      selectedIrt: new Set(times.map((t) => t.irtRow)),
    };
  }, [times, groupBy]);

  if (times.length === 0 && !loading) return null;

  // X-axis is session time: 0 = session start (starting_time is relative to
  // session_start_time, so the axis always begins at 0). The right edge is the
  // end of the last sweep for now.
  // TODO: when the reader surfaces the session end (session_start_time +
  // duration / session_end_time), extend rangeT1 to it so trailing empty time
  // after the last sweep is shown too.
  const all = contextTimes.length ? contextTimes : times;
  const rangeT0 = 0;
  const rangeT1 = all.length
    ? Math.max(...all.map((t) => t.startSec + (t.durationSec || 0)))
    : 1;

  const plotW = Math.max(10, width - MARGIN_L - MARGIN_R);
  const svgH = HEIGHT - HEADER_H;
  const yc = (svgH - AXIS_H) / 2 + 4;
  const xOf = (sec: number) =>
    MARGIN_L + ((sec - rangeT0) / Math.max(1e-6, rangeT1 - rangeT0)) * plotW;

  // Lay the colored selection out in lanes so same-time sweeps (e.g. the two
  // electrodes of a simultaneous recording) don't overlap into a single tick.
  // Lane = the combination of the active categorical channels: the Panels axis,
  // plus the Color axis when it is categorical (not the per-sweep gradient). So
  // either Color-by or Panels-by separating an axis is reflected here.
  const laneKey = (t: SweepTime): string => {
    const parts: string[] = [];
    if (panelsBy !== "none") parts.push("P" + idForAxis(t, panelsBy));
    if (groupBy !== "sweep") parts.push("C" + idForAxis(t, groupBy));
    return parts.join("|");
  };
  const laneIndex = new Map<string, number>();
  for (const t of times) {
    const k = laneKey(t);
    if (!laneIndex.has(k)) laneIndex.set(k, laneIndex.size);
  }
  const laneTop = 4;
  const laneAreaH = svgH - AXIS_H - laneTop;
  const useLanes = laneIndex.size >= 2 && laneIndex.size <= 8;
  const nLanes = useLanes ? laneIndex.size : 1;
  const laneH = laneAreaH / nLanes;
  const laneCenter = (t: SweepTime) =>
    useLanes
      ? laneTop + (laneIndex.get(laneKey(t)) ?? 0) * laneH + laneH / 2
      : yc;
  const tickH = useLanes ? Math.max(8, laneH - 3) : 22;

  const total = contextTimes.length || times.length;
  const summary = sel
    ? `${times.length} of ${total} sweeps selected - earliest at time ${fmtClock(
        sel.t0,
      )} - latest at time ${fmtClock(sel.latest)}`
    : loading
      ? "computing timeline..."
      : "";

  return (
    <div
      style={{
        width,
        height: HEIGHT,
        position: "relative",
        borderTop: "1px solid #eee",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: HEADER_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#666",
        }}
      >
        <span>{summary}</span>
        <span style={{ color: "#aaa", whiteSpace: "nowrap" }}>
          session time (m:ss)
        </span>
      </div>

      <svg width={width} height={svgH} style={{ display: "block" }}>
        {/* gray backdrop: every sweep in the session (skip the selected ones,
            which are drawn colored on top) */}
        {contextTimes.map((t) =>
          sel?.selectedIrt.has(t.irtRow) ? null : (
            <rect
              key={`a-${t.irtRow}`}
              x={xOf(t.startSec)}
              y={laneTop}
              width={1.5}
              height={laneAreaH}
              fill="#ececec"
              onMouseEnter={() =>
                setHover({
                  x: xOf(t.startSec),
                  y: yc,
                  label: `sweep ${t.irtRow} @ ${fmtClock(t.startSec)}`,
                })
              }
              onMouseLeave={() => setHover(null)}
            />
          ),
        )}

        {/* selection highlighted on top, laid out in lanes by group */}
        {sel &&
          times.map((t) => {
            const id = sel.idOf(t);
            const color = sel.colorOf.get(id) || "#2171b5";
            const cy = laneCenter(t);
            return (
              <rect
                key={`s-${t.irtRow}`}
                x={xOf(t.startSec)}
                y={cy - tickH / 2}
                width={2.5}
                height={tickH}
                fill={color}
                onMouseEnter={() =>
                  setHover({
                    x: xOf(t.startSec),
                    y: cy,
                    label: `${sel.labelOf.get(id) || ""} · sweep ${
                      t.irtRow
                    } @ ${fmtClock(t.startSec)}`,
                  })
                }
                onMouseLeave={() => setHover(null)}
              />
            );
          })}

        {/* session-time axis */}
        {(() => {
          const axisY = svgH - AXIS_H + 10;
          return (
            <g>
              <line
                x1={MARGIN_L}
                y1={axisY}
                x2={MARGIN_L + plotW}
                y2={axisY}
                stroke="#ccc"
              />
              {axisTicks(rangeT0, rangeT1).map((tk, i) => (
                <g key={i}>
                  <line
                    x1={xOf(tk)}
                    y1={axisY}
                    x2={xOf(tk)}
                    y2={axisY + 4}
                    stroke="#ccc"
                  />
                  <text
                    x={xOf(tk)}
                    y={axisY + 15}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#888"
                  >
                    {fmtClock(tk)}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>

      {hover && (
        <div
          style={{
            position: "absolute",
            left: Math.min(width - 200, Math.max(0, hover.x + 6)),
            top: hover.y + HEADER_H,
            background: "rgba(0,0,0,0.8)",
            color: "white",
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 3,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {hover.label}
        </div>
      )}
    </div>
  );
};

export default TemporalDistribution;
