import { useMemo } from "react";
import {
  ChainResult,
  ResolvedSweep,
  ScopeSelection,
  useChain,
} from "./useChain";

// The whole-file sweep set is resolved once (the chain walk), then scope,
// faceting, and cross-filtering are pure in-memory queries over these rows.
const EMPTY_SCOPE: ScopeSelection = {};

// One denormalized ("tidy") row per intracellular_recordings sweep: all chain
// provenance (condition/repetition/protocol/electrode/cell) plus every custom
// intracellular_recordings column joined in by name, and references to the bulk
// trace data. The waveforms themselves are NOT here; they stay lazy (loaded by
// reference for the sampled/visible subset only), so the table is just short
// strings/numbers + refs and stays small even for thousands of sweeps.
export type IcephysRow = ResolvedSweep & {
  // Custom (non-structural) intracellular_recordings columns, by name. Empty
  // object when the file has none.
  custom: Record<string, string>;
};

export type IcephysTable = {
  loading: boolean;
  error?: string;
  chainDepth: ChainResult["chainDepth"];
  // Every sweep in the file (one row per IRT row), denormalized.
  rows: IcephysRow[];
  // Names of the custom columns present, for offering them as encoding axes.
  columns: string[];
};

// Resolve the file once and expose it as a flat table. Built on useChain with an
// empty scope (the whole-session set), with the custom columns joined onto each
// row so callers never have to index customColumns by IRT row themselves.
export function useIcephysTable(nwbUrl: string): IcephysTable {
  const chain = useChain(nwbUrl, EMPTY_SCOPE);
  return useMemo(() => {
    const cols = chain.customColumns ?? [];
    const columns = cols.map((c) => c.name);
    const rows: IcephysRow[] = chain.availableSweeps.map((sw) => {
      const custom: Record<string, string> = {};
      for (const c of cols) {
        const v = c.values[sw.irtRow];
        if (v !== undefined) custom[c.name] = v;
      }
      return { ...sw, custom };
    });
    return {
      loading: chain.loading,
      error: chain.error,
      chainDepth: chain.chainDepth,
      rows,
      columns,
    };
  }, [chain]);
}
