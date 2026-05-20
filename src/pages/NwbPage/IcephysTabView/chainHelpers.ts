// Pure helpers for walking the icephys hierarchical-chain.
// Direct port of the patterns in
// ~/MEGAsync/obsidian/heberto_vault/neuroscience/dandi/icephys/chain_walk_poc.py

export const CHAIN_TABLES = [
  "experimental_conditions",
  "repetitions",
  "sequential_recordings",
  "simultaneous_recordings",
  "intracellular_recordings",
] as const;

export type ChainTable = (typeof CHAIN_TABLES)[number];

export type CompoundSweepRef = {
  idxStart: number;
  count: number;
  path: string;
};

// NWB's ragged-index convention: the *_index column stores cumulative end
// offsets, so row k spans [index[k-1] : index[k]] for k>0, and [0 : index[0]]
// for k=0.
export function raggedRange(
  indexCol: ArrayLike<number>,
  row: number,
): [number, number] {
  const start = row === 0 ? 0 : Number(indexCol[row - 1]);
  const end = Number(indexCol[row]);
  return [start, end];
}

// Heuristic: detect a raw HDF5 reference token coming back from the h5wasm
// worker. NWB object references are 8-byte tokens; the worker returns them
// as Uint8Array, which serialises to `{"0":N,"1":N,...}`. We catch both the
// runtime Uint8Array shape and the post-JSON dict shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function looksLikeRawRefBytes(x: any): boolean {
  if (x instanceof Uint8Array) return true;
  if (x && typeof x === "object" && !Array.isArray(x)) {
    const keys = Object.keys(x);
    if (keys.length > 0 && keys.length <= 16) {
      return keys.every((k) => /^\d+$/.test(k));
    }
  }
  return false;
}

// Decode one row of TimeSeriesReferenceVectorData. LINDI delivers compound
// rows as positional JS arrays [idx_start, count, {_REFERENCE: {path,...}}].
// The h5wasm worker path returns raw 8-byte HDF5 reference tokens instead,
// which we cannot dereference client-side; throw a clear error in that case.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractCompoundRow(row: any): CompoundSweepRef {
  if (!row) {
    throw new Error("extractCompoundRow: row is null/undefined");
  }
  const idxStart = Number(row[0]);
  const count = Number(row[1]);
  const refCell = row[2];
  let path: string;
  if (refCell && typeof refCell === "object" && "_REFERENCE" in refCell) {
    path = refCell._REFERENCE.path;
  } else if (refCell && typeof refCell === "object" && "path" in refCell) {
    path = refCell.path;
  } else if (looksLikeRawRefBytes(refCell)) {
    throw new Error(
      "This file is being read via the h5wasm worker, which does not yet " +
        "support HDF5 references. Try a different asset in this dandiset " +
        "(one with a LINDI sidecar at lindi.neurosift.org), or wait for " +
        "worker-side reference support.",
    );
  } else {
    throw new Error(
      `extractCompoundRow: unrecognised reference cell shape: ${JSON.stringify(
        refCell,
      )}`,
    );
  }
  return { idxStart, count, path };
}
