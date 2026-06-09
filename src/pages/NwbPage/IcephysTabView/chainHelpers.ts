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

// Decode one row of TimeSeriesReferenceVectorData. Two row shapes are seen
// in practice:
//   - positional array [idx_start, count, {_REFERENCE: {path,...}}]
//     (LINDI; the 0.2.1-poc h5wasm-worker fork)
//   - named-key object {idx_start, count, timeseries}
//     (some other h5wasm/worker paths)
// Read each field via whichever accessor has it.
//
// idx_start and count are optional: files that store one PatchClampSeries
// per IRT row (a common writer pattern) leave them at the -1 sentinel or
// omit them entirely. We emit NaN for missing values; useSweepData treats
// NaN/-1/non-positive count as "the whole referenced series IS the sweep"
// and slices the full data dataset instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractCompoundRow(row: any): CompoundSweepRef {
  if (!row) {
    throw new Error("extractCompoundRow: row is null/undefined");
  }
  const rawIdxStart = row[0] !== undefined ? row[0] : row.idx_start;
  const rawCount = row[1] !== undefined ? row[1] : row.count;
  const refCell = row[2] !== undefined ? row[2] : row.timeseries;

  const idxStart =
    rawIdxStart === undefined || rawIdxStart === null
      ? Number.NaN
      : Number(rawIdxStart);
  const count =
    rawCount === undefined || rawCount === null ? Number.NaN : Number(rawCount);

  let path: string;
  if (refCell && typeof refCell === "object" && "_REFERENCE" in refCell) {
    path = refCell._REFERENCE.path;
  } else if (refCell && typeof refCell === "object" && "path" in refCell) {
    path = refCell.path;
  } else if (typeof refCell === "string") {
    path = refCell;
  } else if (looksLikeRawRefBytes(refCell)) {
    throw new Error("UNSUPPORTED_ASSET");
  } else {
    throw new Error(
      `extractCompoundRow: unrecognised reference cell shape: ${JSON.stringify(
        refCell,
      )}`,
    );
  }
  return { idxStart, count, path };
}
