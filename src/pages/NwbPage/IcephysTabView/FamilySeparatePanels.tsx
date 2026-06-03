import { FunctionComponent, useMemo } from "react";
import FamilyOverlayPlot from "./FamilyOverlayPlot";
import { categorical } from "./palette";
import { LoadedSweep } from "./useSweepData";

interface Props {
  sweeps: LoadedSweep[];
  width: number;
  height: number;
  // Which axis becomes one panel per value.
  splitBy: "protocol" | "condition" | "repetition" | "electrode";
  // How to color sweeps within each panel (the Color channel).
  innerGroupBy: "protocol" | "sweep" | "condition" | "repetition" | "electrode";
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
            baseColor={innerColor === "sweep" ? categorical(i) : undefined}
            compact
          />
        </div>
      ))}
    </div>
  );
};

export default FamilySeparatePanels;
