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

  // Lanes: one row per electrode. The only sweeps that can share a session-time
  // onset are those recorded on different electrodes at the same instant (NWB
  // simultaneous_recordings); everything else is sequential and already
  // separates along the time axis. So the lane axis is exactly the simultaneity
  // axis: row = which electrode (a stable physical channel), color = the
  // comparison (groupBy), x = time. Rows are independent of the Color/Panels
  // encoding, so the strip layout stays stable as the encoding changes. See the
  // design-doc "Lane layout" entry.
  const MAX_LANES = 8;
  const laneKey = (t: SweepTime): string => t.electrode ?? "(no electrode)";
  // Stable order by electrode label (not first-appearance), so a given file
  // always lays its electrodes out the same way.
  const laneIds = Array.from(new Set(times.map(laneKey))).sort();
  const laneIndex = new Map<string, number>(laneIds.map((k, i) => [k, i]));
  const laneTop = 4;
  const laneAreaH = svgH - AXIS_H - laneTop;
  // With more electrodes than fit legibly, collapse to one centered row (bars
  // may then overlap) rather than render unreadably thin lanes. Real files have
  // one or two intracellular electrodes, so this rarely triggers.
  const useLanes = laneIndex.size >= 2 && laneIndex.size <= MAX_LANES;
  const nLanes = useLanes ? laneIndex.size : 1;
  const laneH = laneAreaH / nLanes;
  const laneCenter = (t: SweepTime) =>
    useLanes
      ? laneTop + (laneIndex.get(laneKey(t)) ?? 0) * laneH + laneH / 2
      : yc;
  // Signal bar fills its lane (full strip height when there's a single lane);
  // its WIDTH is the sweep duration. Context lives on the axis (gray coverage),
  // a different shape, so signal vs context read as different roles.
  const tickH = Math.max(8, laneH - (useLanes ? 3 : 0));

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
        {/* Whole-session gray backdrop: one translucent gray duration band per
            session sweep, full strip height, drawn behind the signal so the
            colored selection sits on top. Overlapping bands accumulate, so a
            time region with many sweeps reads darker than a sparse one. Always
            on (the per-sweep context is the point of the strip). */}
        {contextTimes.map((t, i) => {
          const x0 = xOf(t.startSec);
          const x1 = xOf(t.startSec + (t.durationSec || 0));
          return (
            <rect
              key={`ctxb-${i}`}
              x={x0}
              y={laneTop}
              width={Math.max(1.5, x1 - x0)}
              height={laneAreaH}
              fill="#c0c0c0"
              fillOpacity={0.22}
            />
          );
        })}

        {/* Signal: the selection as colored duration bars (start -> end), laid
            out in lanes by group. The bar width is the sweep's duration, so a
            selection spanning the whole session reads as a full-width bar, not
            a start-point tick. (Context is the gray coverage on the axis.) */}
        {sel &&
          times.map((t) => {
            const id = sel.idOf(t);
            const color = sel.colorOf.get(id) || "#2171b5";
            const cy = laneCenter(t);
            const x0 = xOf(t.startSec);
            const x1 = xOf(t.startSec + (t.durationSec || 0));
            return (
              <rect
                key={`s-${t.irtRow}`}
                x={x0}
                y={cy - tickH / 2}
                width={Math.max(2, x1 - x0)}
                height={tickH}
                rx={1}
                fill={color}
                onMouseEnter={() =>
                  setHover({
                    x: x0,
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
                stroke="#ddd"
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
