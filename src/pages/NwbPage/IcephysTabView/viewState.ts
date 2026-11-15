import type { SelectOption } from "@ui";
import type { ResolvedSweep } from "./useChain";
import type { IcephysRow } from "./useIcephysTable";

type Sweep = ResolvedSweep & { custom?: Record<string, string> };

export const COLOR_BY_VALUES = [
  "auto",
  "protocol",
  "condition",
  "repetition",
  "electrode",
  "cell",
] as const;
export const PANELS_BY_VALUES = [
  "none",
  "protocol",
  "condition",
  "repetition",
  "electrode",
  "cell",
] as const;

export type BuiltInAxis = Exclude<(typeof COLOR_BY_VALUES)[number], "auto">;
/** Whether each built-in axis has two or more values in scope. */
export type AxisVaries = Record<BuiltInAxis, boolean>;
export type CustomAxis = { name: string; axis: string };

const AXIS_LABELS: Record<BuiltInAxis, string> = {
  protocol: "Protocol",
  condition: "Condition",
  repetition: "Repetition",
  electrode: "Electrode",
  cell: "Cell",
};

/** Panel grouping key, matching FamilySeparatePanels so sampled groups line up with the panels drawn. */
export function panelKey(sw: Sweep, axis: string): string {
  if (axis === "condition") return `c${sw.condRow ?? -1}`;
  if (axis === "repetition") return `r${sw.repRow ?? -1}`;
  if (axis === "electrode") return `e:${sw.electrode ?? "?"}`;
  if (axis === "cell") return `cell:${sw.cell ?? "?"}`;
  if (axis.startsWith("col:"))
    return `${axis}=${sw.custom?.[axis.slice(4)] ?? "?"}`;
  return `p:${sw.protocolLabel || `seq ${sw.seqRow}`}`;
}

export function panelLabel(sw: Sweep, axis: string): string {
  if (axis === "condition")
    return sw.condRow !== undefined ? `condition ${sw.condRow}` : "(none)";
  if (axis === "repetition")
    return sw.repRow !== undefined ? `repetition ${sw.repRow}` : "(none)";
  if (axis === "electrode") return sw.electrode ?? "(no electrode)";
  if (axis === "cell") return sw.cell ?? "(no cell)";
  if (axis.startsWith("col:")) return sw.custom?.[axis.slice(4)] ?? "(none)";
  return sw.protocolLabel || `seq ${sw.seqRow}`;
}

/**
 * Up to n evenly spread indices of [0, total), ends first, then by bisection, so a
 * larger n is a superset of a smaller one and "Plot more" reuses loaded sweeps.
 */
export function sampleIndices(total: number, n: number): number[] {
  if (total <= 0) return [];
  if (n >= total) return Array.from({ length: total }, (_, i) => i);
  if (n <= 1) return [0];
  const order: number[] = [];
  const seen = new Set<number>();
  const add = (i: number) => {
    if (i >= 0 && i < total && !seen.has(i)) {
      seen.add(i);
      order.push(i);
    }
  };
  add(0);
  add(total - 1);
  const queue: [number, number][] = [[0, total - 1]];
  while (order.length < n && queue.length) {
    const [lo, hi] = queue.shift()!;
    const mid = Math.floor((lo + hi) / 2);
    add(mid);
    if (mid - lo > 1) queue.push([lo, mid]);
    if (hi - mid > 1) queue.push([mid, hi]);
  }
  return order.slice(0, n).sort((a, b) => a - b);
}

export function numParam(sp: URLSearchParams, key: string): number | undefined {
  const v = sp.get(key);
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** A Color or Panels axis from the address: a built-in, or any "col:<name>", checked against the file once it loads. */
export function axisParam<T extends string>(
  sp: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T | string {
  const v = sp.get(key);
  if (v === null) return fallback;
  if (v.startsWith("col:")) return v;
  return (allowed as readonly string[]).includes(v) ? v : fallback;
}

/** The choices for Color by, Panels by or And by: the first option, then the axes that vary. */
export function axisOptions(
  first: SelectOption,
  varies: AxisVaries,
  custom: CustomAxis[],
  exclude?: string,
): SelectOption[] {
  const builtIn = (Object.keys(AXIS_LABELS) as BuiltInAxis[])
    .filter((axis) => varies[axis] && axis !== exclude)
    .map((axis) => ({ value: axis, label: AXIS_LABELS[axis] }));
  const columns = custom
    .filter((o) => o.axis !== exclude)
    .map((o) => ({ value: o.axis, label: o.name }));
  return [first, ...builtIn, ...columns];
}

/** The axis's label for summaries, such as "Electrode" or a custom column's name. */
export function axisLabel(axis: string): string {
  if (axis.startsWith("col:")) return axis.slice(4);
  return AXIS_LABELS[axis as BuiltInAxis] ?? axis;
}

const plural = (n: number, word: string) =>
  `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

/** "624 sweeps · 1 protocol · 2 electrodes", over the whole file. */
export function fileSummary(rows: IcephysRow[]): string {
  if (!rows.length) return "";
  const distinct = (values: unknown[]) =>
    new Set(values.filter((x) => x !== undefined && x !== "")).size;
  const parts = [plural(rows.length, "sweep")];
  const tiers: [number, string][] = [
    [distinct(rows.map((s) => s.protocolLabel)), "protocol"],
    [distinct(rows.map((s) => s.repRow)), "repetition"],
    [distinct(rows.map((s) => s.condRow)), "condition"],
    [distinct(rows.map((s) => s.electrode)), "electrode"],
  ];
  for (const [n, word] of tiers) if (n > 0) parts.push(plural(n, word));
  return parts.join(" · ");
}
