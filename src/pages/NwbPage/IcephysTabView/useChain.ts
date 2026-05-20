/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  getHdf5Dataset,
  getHdf5DatasetData,
  getHdf5Group,
} from "../hdf5Interface";
import {
  CHAIN_TABLES,
  ChainTable,
  CompoundSweepRef,
  extractCompoundRow,
  raggedRange,
} from "./chainHelpers";

export type ScopeSelection = {
  condRow?: number;
  repRow?: number;
  protoRow?: number;
  sweepIrtRow?: number;
};

export type ResolvedSweep = {
  irtRow: number;
  response: CompoundSweepRef;
  stimulus: CompoundSweepRef;
};

export type ChainResult = {
  loading: boolean;
  chainDepth: ChainTable[];
  // Sweeps actually selected to plot (narrowed by sweepIrtRow if set).
  sweeps: ResolvedSweep[];
  // Pre-narrowing list, used to drive the Sweep selector's option list.
  availableSweeps: ResolvedSweep[];
  error?: string;
};

const IE_PREFIX = "/general/intracellular_ephys";

async function detectChainDepth(nwbUrl: string): Promise<ChainTable[]> {
  const present: ChainTable[] = [];
  for (const t of CHAIN_TABLES) {
    const g = await getHdf5Group(nwbUrl, `${IE_PREFIX}/${t}`);
    if (g) present.push(t);
  }
  return present;
}

async function readIntArray(nwbUrl: string, path: string): Promise<number[]> {
  const data = await getHdf5DatasetData(nwbUrl, path, {});
  if (!data) throw new Error(`failed to read dataset ${path}`);
  const out: number[] = [];
  for (let i = 0; i < (data as any).length; i++)
    out.push(Number((data as any)[i]));
  return out;
}

async function readCompoundArray(nwbUrl: string, path: string): Promise<any[]> {
  const data = await getHdf5DatasetData(nwbUrl, path, {});
  if (!data) throw new Error(`failed to read compound dataset ${path}`);
  return Array.from(data as any) as any[];
}

// -------- chain expansion --------

async function repetitionsForCondition(
  nwbUrl: string,
  condRow: number,
): Promise<number[]> {
  const reps = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/experimental_conditions/repetitions`,
  );
  const repsIdx = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/experimental_conditions/repetitions_index`,
  );
  const [s, e] = raggedRange(repsIdx, condRow);
  return reps.slice(s, e);
}

async function sequentialsForRepetition(
  nwbUrl: string,
  repRow: number,
): Promise<number[]> {
  const seqs = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/repetitions/sequential_recordings`,
  );
  const seqsIdx = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/repetitions/sequential_recordings_index`,
  );
  const [s, e] = raggedRange(seqsIdx, repRow);
  return seqs.slice(s, e);
}

async function expandToIrtRows(
  nwbUrl: string,
  present: ChainTable[],
  scope: ScopeSelection,
): Promise<number[]> {
  // Step 1: determine which sequential_recordings rows are in scope.
  // null = no constraint (broaden to all); empty list = explicit empty.
  let seqRows: number[] | null = null;
  if (scope.protoRow !== undefined) {
    seqRows = [scope.protoRow];
  } else if (
    scope.repRow !== undefined &&
    present.includes("sequential_recordings") &&
    present.includes("repetitions")
  ) {
    seqRows = await sequentialsForRepetition(nwbUrl, scope.repRow);
  } else if (
    scope.condRow !== undefined &&
    present.includes("experimental_conditions") &&
    present.includes("repetitions") &&
    present.includes("sequential_recordings")
  ) {
    const repRows = await repetitionsForCondition(nwbUrl, scope.condRow);
    seqRows = [];
    for (const r of repRows) {
      seqRows.push(...(await sequentialsForRepetition(nwbUrl, r)));
    }
  }

  // Step 2: sequential rows -> simultaneous rows.
  let simRows: number[] | null = null;
  if (seqRows !== null) {
    if (!present.includes("simultaneous_recordings")) return [];
    const seqSim = await readIntArray(
      nwbUrl,
      `${IE_PREFIX}/sequential_recordings/simultaneous_recordings`,
    );
    const seqSimIdx = await readIntArray(
      nwbUrl,
      `${IE_PREFIX}/sequential_recordings/simultaneous_recordings_index`,
    );
    simRows = [];
    for (const sr of seqRows) {
      const [s, e] = raggedRange(seqSimIdx, sr);
      for (let i = s; i < e; i++) simRows.push(seqSim[i]);
    }
  }

  // Step 3: simultaneous rows -> IRT rows.
  if (present.includes("simultaneous_recordings")) {
    const simRec = await readIntArray(
      nwbUrl,
      `${IE_PREFIX}/simultaneous_recordings/recordings`,
    );
    const simRecIdx = await readIntArray(
      nwbUrl,
      `${IE_PREFIX}/simultaneous_recordings/recordings_index`,
    );
    if (simRows === null) {
      const simIds = await readIntArray(
        nwbUrl,
        `${IE_PREFIX}/simultaneous_recordings/id`,
      );
      simRows = simIds.map((_, i) => i);
    }
    const irtRows: number[] = [];
    for (const sr of simRows) {
      const [s, e] = raggedRange(simRecIdx, sr);
      for (let i = s; i < e; i++) irtRows.push(simRec[i]);
    }
    return irtRows;
  }

  // Degenerate: only intracellular_recordings present
  const irtIds = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/intracellular_recordings/id`,
  );
  return irtIds.map((_, i) => i);
}

// -------- the hook --------

export function useChain(nwbUrl: string, scope: ScopeSelection): ChainResult {
  const [result, setResult] = useState<ChainResult>({
    loading: true,
    chainDepth: [],
    sweeps: [],
    availableSweeps: [],
  });

  const scopeKey = JSON.stringify(scope);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setResult((r) => ({ ...r, loading: true, error: undefined }));
      try {
        const ie = await getHdf5Group(nwbUrl, IE_PREFIX);
        if (!ie) {
          if (!cancelled)
            setResult({
              loading: false,
              chainDepth: [],
              sweeps: [],
              availableSweeps: [],
            });
          return;
        }
        const present = await detectChainDepth(nwbUrl);

        // Without a sequential-level selection on a file that has the chain,
        // require *some* upstream selection before walking. Otherwise the
        // tab would auto-render hundreds of sweeps on every file open.
        const hasSeq = present.includes("sequential_recordings");
        if (
          hasSeq &&
          scope.protoRow === undefined &&
          scope.repRow === undefined &&
          scope.condRow === undefined
        ) {
          if (!cancelled)
            setResult({
              loading: false,
              chainDepth: present,
              sweeps: [],
              availableSweeps: [],
            });
          return;
        }

        const irtRows = await expandToIrtRows(nwbUrl, present, scope);

        // Read the two compound columns once and index by IRT row.
        const respFull = await readCompoundArray(
          nwbUrl,
          `${IE_PREFIX}/intracellular_recordings/responses/response`,
        );
        const stimFull = await readCompoundArray(
          nwbUrl,
          `${IE_PREFIX}/intracellular_recordings/stimuli/stimulus`,
        );

        const availableSweeps: ResolvedSweep[] = irtRows.map((irtRow) => ({
          irtRow,
          response: extractCompoundRow(respFull[irtRow]),
          stimulus: extractCompoundRow(stimFull[irtRow]),
        }));

        const sweeps =
          scope.sweepIrtRow !== undefined
            ? availableSweeps.filter((s) => s.irtRow === scope.sweepIrtRow)
            : availableSweeps;

        if (!cancelled)
          setResult({
            loading: false,
            chainDepth: present,
            sweeps,
            availableSweeps,
          });
      } catch (exc: any) {
        if (!cancelled)
          setResult({
            loading: false,
            chainDepth: [],
            sweeps: [],
            availableSweeps: [],
            error: exc?.message || String(exc),
          });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nwbUrl, scopeKey]);

  return result;
}

// -------- selector-population helpers --------

export type SelectorOption = {
  row: number;
  label: string;
  nChildren: number;
};

export async function readConditions(
  nwbUrl: string,
): Promise<SelectorOption[]> {
  const g = await getHdf5Group(nwbUrl, `${IE_PREFIX}/experimental_conditions`);
  if (!g) return [];

  const idDs = await getHdf5Dataset(
    nwbUrl,
    `${IE_PREFIX}/experimental_conditions/id`,
  );
  if (!idDs) return [];
  const n = idDs.shape[0];

  // Optional `condition` label column
  let labels: string[] | null = null;
  if (g.datasets.find((d) => d.name === "condition")) {
    try {
      const lab = (await getHdf5DatasetData(
        nwbUrl,
        `${IE_PREFIX}/experimental_conditions/condition`,
        {},
      )) as any;
      labels = Array.from(lab).map((x: any) =>
        typeof x === "string" ? x : String(x),
      );
    } catch {
      labels = null;
    }
  }

  // Child-count via repetitions_index ragged offsets
  let repsIdx: number[] | null = null;
  if (g.datasets.find((d) => d.name === "repetitions_index")) {
    try {
      repsIdx = await readIntArray(
        nwbUrl,
        `${IE_PREFIX}/experimental_conditions/repetitions_index`,
      );
    } catch {
      repsIdx = null;
    }
  }

  const out: SelectorOption[] = [];
  for (let i = 0; i < n; i++) {
    const label = labels ? labels[i] : `Condition ${i}`;
    const nChildren = repsIdx
      ? raggedRange(repsIdx, i)[1] - raggedRange(repsIdx, i)[0]
      : 0;
    out.push({ row: i, label, nChildren });
  }
  return out;
}

export async function readRepetitions(
  nwbUrl: string,
  condRow?: number,
): Promise<SelectorOption[]> {
  const g = await getHdf5Group(nwbUrl, `${IE_PREFIX}/repetitions`);
  if (!g) return [];

  // Determine which repetition rows to surface
  let repRows: number[];
  if (condRow !== undefined) {
    const ec = await getHdf5Group(
      nwbUrl,
      `${IE_PREFIX}/experimental_conditions`,
    );
    if (ec) {
      repRows = await repetitionsForCondition(nwbUrl, condRow);
    } else {
      const idDs = await getHdf5Dataset(nwbUrl, `${IE_PREFIX}/repetitions/id`);
      repRows = Array.from({ length: idDs?.shape[0] || 0 }, (_, i) => i);
    }
  } else {
    const idDs = await getHdf5Dataset(nwbUrl, `${IE_PREFIX}/repetitions/id`);
    repRows = Array.from({ length: idDs?.shape[0] || 0 }, (_, i) => i);
  }

  // Child-count via sequential_recordings_index
  let seqsIdx: number[] | null = null;
  if (g.datasets.find((d) => d.name === "sequential_recordings_index")) {
    try {
      seqsIdx = await readIntArray(
        nwbUrl,
        `${IE_PREFIX}/repetitions/sequential_recordings_index`,
      );
    } catch {
      seqsIdx = null;
    }
  }

  return repRows.map((r) => ({
    row: r,
    label: `Repetition ${r}`,
    nChildren: seqsIdx
      ? raggedRange(seqsIdx, r)[1] - raggedRange(seqsIdx, r)[0]
      : 0,
  }));
}

export async function readSequentialProtocols(
  nwbUrl: string,
  repRow?: number,
): Promise<SelectorOption[]> {
  const g = await getHdf5Group(nwbUrl, `${IE_PREFIX}/sequential_recordings`);
  if (!g) return [];

  // Restrict to seq rows belonging to the selected repetition, if any.
  let seqRows: number[];
  if (repRow !== undefined) {
    const r = await getHdf5Group(nwbUrl, `${IE_PREFIX}/repetitions`);
    if (r) {
      seqRows = await sequentialsForRepetition(nwbUrl, repRow);
    } else {
      const idDs = await getHdf5Dataset(
        nwbUrl,
        `${IE_PREFIX}/sequential_recordings/id`,
      );
      seqRows = Array.from({ length: idDs?.shape[0] || 0 }, (_, i) => i);
    }
  } else {
    const idDs = await getHdf5Dataset(
      nwbUrl,
      `${IE_PREFIX}/sequential_recordings/id`,
    );
    seqRows = Array.from({ length: idDs?.shape[0] || 0 }, (_, i) => i);
  }

  // Read stimulus_type labels for the seqRows we care about
  const stimTypeData = (await getHdf5DatasetData(
    nwbUrl,
    `${IE_PREFIX}/sequential_recordings/stimulus_type`,
    {},
  )) as any;
  const simIdx = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/sequential_recordings/simultaneous_recordings_index`,
  );

  return seqRows.map((r) => {
    const raw = stimTypeData?.[r];
    const label =
      typeof raw === "string" ? raw : raw != null ? String(raw) : `row ${r}`;
    const [s, e] = raggedRange(simIdx, r);
    return { row: r, label, nChildren: e - s };
  });
}
