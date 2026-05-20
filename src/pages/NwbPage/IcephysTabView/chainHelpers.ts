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

// Decode one row of TimeSeriesReferenceVectorData. LINDI delivers compound
// rows as positional JS arrays [idx_start, count, {_REFERENCE: {path,...}}].
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
  } else {
    throw new Error(
      `extractCompoundRow: unrecognised reference cell shape: ${JSON.stringify(
        refCell,
      )}`,
    );
  }
  return { idxStart, count, path };
}
