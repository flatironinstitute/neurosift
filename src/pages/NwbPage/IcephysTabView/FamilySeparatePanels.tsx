import { FunctionComponent, useMemo } from "react";
import { facetColors } from "./FacetLegend";
import FamilyOverlayPlot from "./FamilyOverlayPlot";
import { categorical } from "./palette";
import { LoadedSweep } from "./useSweepData";

interface Props {
  sweeps: LoadedSweep[];
  width: number;
  height: number;
  // Which axis becomes one panel per value.
  splitBy: "protocol" | "condition" | "repetition" | "electrode" | "cell";
  // How to color sweeps within each panel (the Color channel).
  innerGroupBy:
    | "protocol"
    | "sweep"
    | "condition"
    | "repetition"
    | "electrode"
    | "cell";
  // Within-sweep x-window crop, applied to every panel (so the window is shared
  // across panels). Null = autorange.
  xRangeMs?: [number, number] | null;
  // Fixed y-range per display unit, shared across panels (locked y). Undefined
  // = each panel autoranges its own y.
  yRangeByUnit?: Record<string, [number, number]>;
}

const PANEL_MIN_W = 300;
const PANEL_H = 220;
const LABEL_H = 18;

function groupOf(
  sw: LoadedSweep,
  splitBy: Props["splitBy"],
): { key: string; label: string } {
  if (splitBy === "condition") {
    return {
      key: `c${sw.condRow ?? -1}`,
      label: sw.condRow !== undefined ? `condition ${sw.condRow}` : "(none)",
    };
  }
  if (splitBy === "repetition") {
    return {
      key: `r${sw.repRow ?? -1}`,
      label: sw.repRow !== undefined ? `repetition ${sw.repRow}` : "(none)",
    };
  }
  if (splitBy === "electrode") {
    return {
      key: `e:${sw.electrode ?? "?"}`,
      label: sw.electrode ?? "(no electrode)",
    };
  }
  if (splitBy === "cell") {
    return { key: `cell:${sw.cell ?? "?"}`, label: sw.cell ?? "(no cell)" };
  }
  // protocol: split by name so the same protocol across repetitions is one panel
  const name = sw.protocolLabel || `seq ${sw.seqRow}`;
  return { key: `p:${name}`, label: name };
}

const FamilySeparatePanels: FunctionComponent<Props> = ({
  sweeps,
  width,
  height,
  splitBy,
  innerGroupBy,
  xRangeMs,
  yRangeByUnit,
}) => {
  const groups = useMemo(() => {
    const order: string[] = [];
    const byKey = new Map<string, { label: string; sweeps: LoadedSweep[] }>();
    for (const sw of sweeps) {
      const g = groupOf(sw, splitBy);
      let entry = byKey.get(g.key);
      if (!entry) {
        entry = { label: g.label, sweeps: [] };
        byKey.set(g.key, entry);
        order.push(g.key);
      }
      entry.sweeps.push(sw);
    }
    return order.map((k) => byKey.get(k)!);
  }, [sweeps, splitBy]);

  // Coloring by the split axis would be constant within a panel; use sweeps.
  const innerColor = innerGroupBy === splitBy ? "sweep" : innerGroupBy;

  const cols = Math.max(
    1,
    Math.min(groups.length, Math.floor(width / PANEL_MIN_W)),
  );
  const panelW = Math.floor(width / cols);

  // Shared categorical colors (when the inner color is categorical) so the
  // panels and the sidebar legend agree. The legend itself is rendered in the
  // sidebar by IcephysTabView, not here, to keep the crowded plot area clean.
  const fc = innerColor !== "sweep" ? facetColors(sweeps, innerColor) : null;

  return (
    <div
      style={{
        width,
        height,
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexWrap: "wrap",
        alignContent: "flex-start",
      }}
    >
      {groups.map((g, i) => (
        <div key={i} style={{ width: panelW, boxSizing: "border-box" }}>
          <div
            style={{
              height: LABEL_H,
              fontSize: 11,
              fontWeight: 600,
              color: "#444",
              padding: "0 6px",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {g.label} · {g.sweeps.length} sweep
            {g.sweeps.length === 1 ? "" : "s"}
          </div>
          <FamilyOverlayPlot
            sweeps={g.sweeps}
            width={panelW}
            height={PANEL_H - LABEL_H}
            groupBy={innerColor}
            groupColors={fc?.colorOf}
            baseColor={innerColor === "sweep" ? categorical(i) : undefined}
            xRangeMs={xRangeMs}
            yRangeByUnit={yRangeByUnit}
            compact
          />
        </div>
      ))}
    </div>
  );
};

export default FamilySeparatePanels;
