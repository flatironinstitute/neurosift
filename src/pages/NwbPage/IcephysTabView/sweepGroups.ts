import { categorical, internId } from "./palette";
import { LoadedSweep } from "./useSweepData";

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

// Shared color assignment for a faceted view's inner-color axis. Computed once
// over all sweeps (global first-appearance order) so every panel and this legend
// use the same color for the same group. Categorical only; the per-sweep
// gradient is handled separately (each panel uses its own hue).
export function facetColors(
  sweeps: LoadedSweep[],
  axis: GroupBy,
): {
  order: number[];
  labelOf: Map<number, string>;
  colorOf: Map<number, string>;
} {
  const order: number[] = [];
  const labelOf = new Map<number, string>();
  for (const sw of sweeps) {
    const g = groupOf(sw, axis);
    if (!labelOf.has(g.id)) {
      order.push(g.id);
      labelOf.set(g.id, g.label);
    }
  }
  const colorOf = new Map<number, string>();
  order.forEach((id, i) => colorOf.set(id, categorical(i)));
  return { order, labelOf, colorOf };
}
