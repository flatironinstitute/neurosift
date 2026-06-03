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
};

export type ResolvedSweep = {
  irtRow: number;
  // Parent sequential_recordings row, if discoverable from the chain walk.
  // Used to label and group traces by Protocol in the family overlay.
  seqRow?: number;
  // Provenance up the chain (for "compare by" faceting): which repetition and
  // experimental condition this sweep descended from.
  repRow?: number;
  condRow?: number;
  // The within-simultaneous electrode (channel) identity, e.g. "electrode-0".
  electrode?: string;
  protocolLabel?: string;
  response: CompoundSweepRef;
  stimulus: CompoundSweepRef;
};

export type ChainResult = {
  loading: boolean;
  chainDepth: ChainTable[];
  // Sweeps in the current scope (Condition/Repetition/Protocol).
  sweeps: ResolvedSweep[];
  // Same set as `sweeps`; retained for callers that count the in-scope sweeps
  // (e.g. the "compare by" cardinality check and the empty-state message).
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

// Resolve an electrode reference cell to a short label (the electrode group's
// name, e.g. "electrode-0"). Mirrors the ref-cell shapes handled in chainHelpers.
function electrodeLabelFromRef(cell: any): string | undefined {
  let path: string | undefined;
  if (cell && typeof cell === "object" && "_REFERENCE" in cell)
    path = cell._REFERENCE?.path;
  else if (cell && typeof cell === "object" && "path" in cell) path = cell.path;
  else if (typeof cell === "string") path = cell;
  if (!path) return undefined;
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || undefined;
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

// -1 in scope.{condRow,repRow,protoRow} means "All" (explicit no-filter at
// that tier). Treated the same as undefined for filtering, but distinct in
// the rendering gate because it represents an explicit user pick.
export const ALL_ROW = -1;
const isSpecificRow = (v: number | undefined): v is number =>
  v !== undefined && v !== ALL_ROW;

type IrtEntry = {
  irtRow: number;
  seqRow?: number;
  repRow?: number;
  condRow?: number;
};

async function readStimTypes(nwbUrl: string, nSeq: number): Promise<string[]> {
  try {
    const data = (await getHdf5DatasetData(
      nwbUrl,
      `${IE_PREFIX}/sequential_recordings/stimulus_type`,
      {},
    )) as any;
    if (data)
      return Array.from(data).map((x: any) =>
        typeof x === "string" ? x : String(x),
      );
  } catch {
    // fall through to row-index labels
  }
  return Array.from({ length: nSeq }, (_, i) => `row ${i}`);
}

// Inverse map seqRow -> repRow (from repetitions/sequential_recordings).
async function buildSeqToRep(nwbUrl: string): Promise<Map<number, number>> {
  const seqs = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/repetitions/sequential_recordings`,
  );
  const idx = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/repetitions/sequential_recordings_index`,
  );
  const map = new Map<number, number>();
  for (let rep = 0; rep < idx.length; rep++) {
    const [s, e] = raggedRange(idx, rep);
    for (let i = s; i < e; i++) if (!map.has(seqs[i])) map.set(seqs[i], rep);
  }
  return map;
}

// Inverse map repRow -> condRow (from experimental_conditions/repetitions).
async function buildRepToCond(nwbUrl: string): Promise<Map<number, number>> {
  const reps = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/experimental_conditions/repetitions`,
  );
  const idx = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/experimental_conditions/repetitions_index`,
  );
  const map = new Map<number, number>();
  for (let cond = 0; cond < idx.length; cond++) {
    const [s, e] = raggedRange(idx, cond);
    for (let i = s; i < e; i++) if (!map.has(reps[i])) map.set(reps[i], cond);
  }
  return map;
}

async function expandToIrtRows(
  nwbUrl: string,
  present: ChainTable[],
  scope: ScopeSelection,
): Promise<IrtEntry[]> {
  // Provenance maps so each IRT row can carry its repetition and experimental
  // condition (for the "compare by" faceting), independent of the active filter.
  const seqToRep = present.includes("repetitions")
    ? await buildSeqToRep(nwbUrl)
    : null;
  const repToCond =
    present.includes("experimental_conditions") &&
    present.includes("repetitions")
      ? await buildRepToCond(nwbUrl)
      : null;

  // Step 1: determine which sequential_recordings rows are in scope.
  // null = no constraint (broaden to all).
  let seqRows: number[] | null = null;
  if (present.includes("sequential_recordings")) {
    const idDs = await getHdf5Dataset(
      nwbUrl,
      `${IE_PREFIX}/sequential_recordings/id`,
    );
    const nSeq = idDs?.shape[0] ?? 0;
    const allSeq = Array.from({ length: nSeq }, (_, i) => i);

    // Upstream (condition/repetition) constraint, if any.
    let upstream: number[] | null = null;
    if (isSpecificRow(scope.repRow) && present.includes("repetitions")) {
      upstream = await sequentialsForRepetition(nwbUrl, scope.repRow);
    } else if (
      isSpecificRow(scope.condRow) &&
      present.includes("experimental_conditions") &&
      present.includes("repetitions")
    ) {
      const repRows = await repetitionsForCondition(nwbUrl, scope.condRow);
      upstream = [];
      for (const r of repRows) {
        upstream.push(...(await sequentialsForRepetition(nwbUrl, r)));
      }
    }

    const base = upstream ?? allSeq;

    if (isSpecificRow(scope.protoRow)) {
      // Aggregate by protocol NAME: the picked row is a representative; select
      // every sequential row in the upstream scope sharing its stimulus_type.
      const stim = await readStimTypes(nwbUrl, nSeq);
      const name = stim[scope.protoRow];
      seqRows = base.filter((sr) => stim[sr] === name);
    } else {
      seqRows = base;
    }
  }

  // Step 2: sequential rows -> simultaneous rows, keeping parentage.
  // Map simRow -> seqRow (the parent protocol it came from).
  let simToSeq: Map<number, number> | null = null;
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
    simToSeq = new Map();
    for (const sr of seqRows) {
      const [s, e] = raggedRange(seqSimIdx, sr);
      for (let i = s; i < e; i++) {
        const sim = seqSim[i];
        simRows.push(sim);
        // If a simRow happens to belong to multiple seqRows (rare/edge),
        // first-write-wins, which is good enough for labeling.
        if (!simToSeq.has(sim)) simToSeq.set(sim, sr);
      }
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
    const out: IrtEntry[] = [];
    for (const sr of simRows) {
      const [s, e] = raggedRange(simRecIdx, sr);
      const parentSeq = simToSeq?.get(sr);
      const repRow =
        parentSeq !== undefined ? seqToRep?.get(parentSeq) : undefined;
      const condRow = repRow !== undefined ? repToCond?.get(repRow) : undefined;
      for (let i = s; i < e; i++) {
        out.push({ irtRow: simRec[i], seqRow: parentSeq, repRow, condRow });
      }
    }
    return out;
  }

  // Degenerate: only intracellular_recordings present
  const irtIds = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/intracellular_recordings/id`,
  );
  return irtIds.map((_, i) => ({ irtRow: i }));
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
      // Always determine chain depth first, even if everything else fails, so
      // the sidebar reflects what tables actually exist in the file.
      let present: ChainTable[] = [];
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
        present = await detectChainDepth(nwbUrl);
      } catch (exc: any) {
        if (!cancelled)
          setResult({
            loading: false,
            chainDepth: [],
            sweeps: [],
            availableSweeps: [],
            error: exc?.message || String(exc),
          });
        return;
      }

      try {
        const irtEntries = await expandToIrtRows(nwbUrl, present, scope);

        // Read the two compound columns once and index by IRT row.
        const respFull = await readCompoundArray(
          nwbUrl,
          `${IE_PREFIX}/intracellular_recordings/responses/response`,
        );
        const stimFull = await readCompoundArray(
          nwbUrl,
          `${IE_PREFIX}/intracellular_recordings/stimuli/stimulus`,
        );

        // Build a seqRow -> stimulus_type label map for protocol-level grouping
        // in the family overlay. Skip when the file has no sequential table.
        let seqLabels: string[] | null = null;
        if (present.includes("sequential_recordings")) {
          try {
            const data = (await getHdf5DatasetData(
              nwbUrl,
              `${IE_PREFIX}/sequential_recordings/stimulus_type`,
              {},
            )) as any;
            if (data) {
              seqLabels = Array.from(data).map((x: any) =>
                typeof x === "string" ? x : String(x),
              );
            }
          } catch {
            seqLabels = null;
          }
        }

        // Electrode (channel) identity per IRT row, the within-simultaneous
        // axis. Refs only resolve on the LINDI path; on the raw wasm path this
        // stays undefined and the Electrode axis simply won't appear.
        let electrodeLabels: (string | undefined)[] | null = null;
        try {
          const eData = await readCompoundArray(
            nwbUrl,
            `${IE_PREFIX}/intracellular_recordings/electrodes/electrode`,
          );
          electrodeLabels = eData.map(electrodeLabelFromRef);
        } catch {
          electrodeLabels = null;
        }

        const availableSweeps: ResolvedSweep[] = irtEntries.map((entry) => ({
          irtRow: entry.irtRow,
          seqRow: entry.seqRow,
          repRow: entry.repRow,
          condRow: entry.condRow,
          electrode: electrodeLabels
            ? electrodeLabels[entry.irtRow]
            : undefined,
          protocolLabel:
            entry.seqRow !== undefined && seqLabels
              ? seqLabels[entry.seqRow]
              : undefined,
          response: extractCompoundRow(respFull[entry.irtRow]),
          stimulus: extractCompoundRow(stimFull[entry.irtRow]),
        }));

        const sweeps = availableSweeps;

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
            // Preserve chain depth so the sidebar still shows what's in the
            // file even when the compound walk fails (e.g. raw refs from the
            // h5wasm worker).
            loading: false,
            chainDepth: present,
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
  if (isSpecificRow(condRow)) {
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
  if (isSpecificRow(repRow)) {
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

  // Read stimulus_type labels for the seqRows we care about. The column is
  // optional per the spec; fall back to `row N` labels if it is missing or
  // unreadable rather than failing the whole chain walk.
  let stimTypeData: any = null;
  try {
    if (g.datasets.find((d) => d.name === "stimulus_type")) {
      stimTypeData = await getHdf5DatasetData(
        nwbUrl,
        `${IE_PREFIX}/sequential_recordings/stimulus_type`,
        {},
      );
    }
  } catch {
    stimTypeData = null;
  }
  const simIdx = await readIntArray(
    nwbUrl,
    `${IE_PREFIX}/sequential_recordings/simultaneous_recordings_index`,
  );

  // Dedup by protocol name: each unique stimulus_type becomes one option whose
  // `row` is a representative sequential row, and whose child count sums all of
  // its instances across the in-scope repetitions/conditions. Picking it selects
  // every same-named protocol in scope (see expandToIrtRows).
  const byName = new Map<string, SelectorOption>();
  for (const r of seqRows) {
    const raw = stimTypeData?.[r];
    const label =
      typeof raw === "string" ? raw : raw != null ? String(raw) : `row ${r}`;
    const [s, e] = raggedRange(simIdx, r);
    const cur = byName.get(label);
    if (!cur) byName.set(label, { row: r, label, nChildren: e - s });
    else cur.nChildren += e - s;
  }
  return [...byName.values()];
}
