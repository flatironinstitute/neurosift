import { EmptyState } from "@ui";
import { useCssVars } from "@components/useCssVars";
import { FunctionComponent, useMemo } from "react";
import { facetColors } from "./sweepGroups";
import FamilyOverlayPlot from "./FamilyOverlayPlot";
import { categorical } from "./palette";
import { LoadedSweep } from "./useSweepData";

// 2-D faceting (facet_grid): one panel per (rowAxis value, colAxis value). The
// Color channel (innerGroupBy) is the third encoding inside each cell. Prototype
// for the cell-axis follow-up; pairs naturally with the Cell axis (e.g. Cell down
// the rows, Condition across the columns).

// "col:<name>" = a custom intracellular_recordings column axis.
type Axis =
  | "protocol"
  | "condition"
  | "repetition"
  | "electrode"
  | "cell"
  | (string & {});
type InnerAxis =
  | "protocol"
  | "sweep"
  | "condition"
  | "repetition"
  | "electrode"
  | "cell"
  | (string & {});

interface Props {
  sweeps: LoadedSweep[];
  width: number;
  height: number;
  rowAxis: Axis;
  colAxis: Axis;
  innerGroupBy: InnerAxis;
  // Within-sweep x-window crop, shared across every cell. Null = autorange.
  xRangeMs?: [number, number] | null;
  // Fixed y-range per display unit, shared across cells (locked y). Undefined =
  // each cell autoranges.
  yRangeByUnit?: Record<string, [number, number]>;
}

const ROWLAB_W = 84;
const COLLAB_H = 18;
const CELL_H = 190;
const MIN_CELL_W = 170;
// Legibility guard: a grid with more cells than this is unreadable confetti.
const MAX_CELLS = 36;

function keyLabel(sw: LoadedSweep, axis: Axis): { key: string; label: string } {
  if (axis === "condition")
    return {
      key: `c${sw.condRow ?? -1}`,
      label: sw.condRow !== undefined ? `cond ${sw.condRow}` : "(none)",
    };
  if (axis === "repetition")
    return {
      key: `r${sw.repRow ?? -1}`,
      label: sw.repRow !== undefined ? `rep ${sw.repRow}` : "(none)",
    };
  if (axis === "electrode")
    return {
      key: `e:${sw.electrode ?? "?"}`,
      label: sw.electrode ?? "(no electrode)",
    };
  if (axis === "cell")
    return { key: `cell:${sw.cell ?? "?"}`, label: sw.cell ?? "(no cell)" };
  if (axis.startsWith("col:")) {
    const v = sw.custom?.[axis.slice(4)];
    return { key: `${axis}=${v ?? "?"}`, label: v ?? "(none)" };
  }
  const name = sw.protocolLabel || `seq ${sw.seqRow}`;
  return { key: `p:${name}`, label: name };
}

const FamilyFacetGrid: FunctionComponent<Props> = ({
  sweeps,
  width,
  height,
  rowAxis,
  colAxis,
  innerGroupBy,
  xRangeMs,
  yRangeByUnit,
}) => {
  const grid = useMemo(() => {
    const rowOrder: string[] = [];
    const colOrder: string[] = [];
    const rowLabel = new Map<string, string>();
    const colLabel = new Map<string, string>();
    const cells = new Map<string, LoadedSweep[]>(); // keyed by JSON.stringify([rowKey, colKey])
    for (const sw of sweeps) {
      const r = keyLabel(sw, rowAxis);
      const c = keyLabel(sw, colAxis);
      if (!rowLabel.has(r.key)) {
        rowLabel.set(r.key, r.label);
        rowOrder.push(r.key);
      }
      if (!colLabel.has(c.key)) {
        colLabel.set(c.key, c.label);
        colOrder.push(c.key);
      }
      const ck = JSON.stringify([r.key, c.key]);
      const arr = cells.get(ck);
      if (arr) arr.push(sw);
      else cells.set(ck, [sw]);
    }
    return { rowOrder, colOrder, rowLabel, colLabel, cells };
  }, [sweeps, rowAxis, colAxis]);

  const nRows = grid.rowOrder.length;
  const nCols = grid.colOrder.length;

  const cellW = Math.max(
    MIN_CELL_W,
    Math.floor((width - ROWLAB_W) / Math.max(1, nCols)),
  );
  const ref = useCssVars<HTMLDivElement>({
    "--icephys-w": width,
    "--icephys-h": height,
    "--facet-columns": `${ROWLAB_W}px repeat(${nCols}, ${cellW}px)`,
    "--facet-cell-h": CELL_H,
    "--facet-label-h": COLLAB_H,
  });

  if (nRows * nCols > MAX_CELLS) {
    return (
      <EmptyState title="Too many panels to draw">
        {`${nRows} × ${nCols} = ${nRows * nCols} panels is too many to read (the limit is ${MAX_CELLS}). Narrow the scope, or use one Panels by axis and put the other on Color by.`}
      </EmptyState>
    );
  }

  const innerColor = innerGroupBy === rowAxis ? "sweep" : innerGroupBy;
  // Shared colors so the cells and the settings legend agree.
  const fc = innerColor !== "sweep" ? facetColors(sweeps, innerColor) : null;

  return (
    <div ref={ref} className="icephys-chart-box">
      <div className="icephys-facet-grid">
        <div className="icephys-facet-corner" />
        {grid.colOrder.map((ck) => (
          <div
            key={`col-${ck}`}
            className="icephys-facet-col"
            title={grid.colLabel.get(ck)}
          >
            {grid.colLabel.get(ck)}
          </div>
        ))}
        {grid.rowOrder.map((rk, ri) => [
          <div
            key={`rowlab-${rk}`}
            className="icephys-facet-row"
            title={grid.rowLabel.get(rk)}
          >
            {grid.rowLabel.get(rk)}
          </div>,
          ...grid.colOrder.map((ck) => {
            const cellSweeps = grid.cells.get(JSON.stringify([rk, ck])) ?? [];
            return (
              <div key={`cell-${rk}-${ck}`} className="icephys-facet-cell">
                {cellSweeps.length > 0 ? (
                  <FamilyOverlayPlot
                    sweeps={cellSweeps}
                    width={cellW}
                    height={CELL_H}
                    groupBy={innerColor}
                    groupColors={fc?.colorOf}
                    baseColor={
                      innerColor === "sweep" ? categorical(ri) : undefined
                    }
                    xRangeMs={xRangeMs}
                    yRangeByUnit={yRangeByUnit}
                    compact
                  />
                ) : (
                  <span className="icephys-facet-empty">No sweeps</span>
                )}
              </div>
            );
          }),
        ])}
      </div>
    </div>
  );
};

export default FamilyFacetGrid;
