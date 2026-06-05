/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  getHdf5Dataset,
  getHdf5DatasetData,
  getHdf5Group,
} from "../hdf5Interface";
import { ResolvedSweep } from "./useChain";

export type SweepTrace = {
  t: Float32Array;
  y: Float32Array;
  unit: string; // SI unit string from the data dataset's NWB `unit` attr
};

export type LoadedSweep = {
  irtRow: number;
  seqRow?: number;
  repRow?: number;
  condRow?: number;
  electrode?: string;
  cell?: string;
  protocolLabel?: string;
  response: SweepTrace;
  // null when the sweep has no real stimulus (IZeroClampSeries), see below.
  stimulus: SweepTrace | null;
  // True for zero-current-clamp recordings, which have no stimulus. The plot
  // suppresses the stimulus panel for these.
  noStimulus?: boolean;
};

export type SweepDataResult = {
  loading: boolean;
  loaded: LoadedSweep[];
  error?: string;
};

async function loadOneSide(
  nwbUrl: string,
  side: { path: string; idxStart: number; count: number },
): Promise<SweepTrace> {
  // PatchClampSeries group must contain `data`, plus either
  //   - `starting_time` (with a `rate` attribute) for regularly-sampled data, or
  //   - `timestamps` (a 1D dataset of per-sample times) for irregular sampling.
  // We try `starting_time` first since it is the common icephys case.
  const dataDs = await getHdf5Dataset(nwbUrl, `${side.path}/data`);
  if (!dataDs) {
    throw new Error(
      `no 'data' dataset at ${side.path} (group missing or has unexpected layout)`,
    );
  }
  const conversion = Number(dataDs.attrs?.conversion ?? 1);
  const offset = Number(dataDs.attrs?.offset ?? 0);
  const unit = String(dataDs.attrs?.unit ?? "");

  const startTimeDs = await getHdf5Dataset(
    nwbUrl,
    `${side.path}/starting_time`,
  );
  const timestampsDs = startTimeDs
    ? null
    : await getHdf5Dataset(nwbUrl, `${side.path}/timestamps`);

  if (!startTimeDs && !timestampsDs) {
    throw new Error(
      `missing both 'starting_time' and 'timestamps' under ${side.path}`,
    );
  }

  // NWB's TimeSeriesReferenceVectorData uses `idx_start = -1` and/or
  // `count = -1` as a sentinel meaning "no slice info; the whole referenced
  // series is the sweep." Some files also omit the fields entirely, in
  // which case extractCompoundRow emits NaN. Both cases collapse to the
  // same fallback: read the full data dataset.
  let effectiveStart = side.idxStart;
  let effectiveCount = side.count;
  if (
    !Number.isFinite(effectiveStart) ||
    !Number.isFinite(effectiveCount) ||
    effectiveStart < 0 ||
    effectiveCount <= 0
  ) {
    const dataLen = dataDs.shape?.[0] ?? 0;
    if (dataLen <= 0) {
      throw new Error(
        `no slice info (idx_start=${side.idxStart}, count=${side.count}) ` +
          `and 'data' at ${side.path} is empty`,
      );
    }
    effectiveStart = 0;
    effectiveCount = dataLen;
  }

  const raw = (await getHdf5DatasetData(nwbUrl, `${side.path}/data`, {
    slice: [[effectiveStart, effectiveStart + effectiveCount]],
  })) as any;
  if (!raw) throw new Error(`failed to load slice for ${side.path}`);

  const n = effectiveCount;
  const t = new Float32Array(n);
  const y = new Float32Array(n);

  if (startTimeDs) {
    const rate = Number(startTimeDs.attrs?.rate || 0);
    if (!rate || !isFinite(rate)) {
      throw new Error(`invalid rate on ${side.path}/starting_time`);
    }
    const dt = 1 / rate;
    for (let i = 0; i < n; i++) {
      t[i] = i * dt; // sweep-local time
      y[i] = Number(raw[i]) * conversion + offset;
    }
  } else {
    // timestamps-based: load the matching slice of the timestamps array and
    // rebase to sweep-local time (subtract t[0]).
    const tsRaw = (await getHdf5DatasetData(nwbUrl, `${side.path}/timestamps`, {
      slice: [[effectiveStart, effectiveStart + effectiveCount]],
    })) as any;
    if (!tsRaw) {
      throw new Error(`failed to load timestamps slice for ${side.path}`);
    }
    const t0 = Number(tsRaw[0]);
    for (let i = 0; i < n; i++) {
      t[i] = Number(tsRaw[i]) - t0;
      y[i] = Number(raw[i]) * conversion + offset;
    }
  }
  return { t, y, unit };
}

export function useSweepData(
  nwbUrl: string,
  sweeps: ResolvedSweep[],
): SweepDataResult {
  const [result, setResult] = useState<SweepDataResult>({
    loading: false,
    loaded: [],
  });

  // Stable dep: serialise the sweep descriptors
  const sweepsKey = JSON.stringify(
    sweeps.map((s) => [
      s.irtRow,
      s.response.path,
      s.response.idxStart,
      s.response.count,
      s.stimulus.path,
      s.stimulus.idxStart,
      s.stimulus.count,
    ]),
  );

  useEffect(() => {
    let cancelled = false;
    if (sweeps.length === 0) {
      setResult({ loading: false, loaded: [] });
      return;
    }
    setResult((r) => ({ ...r, loading: true, error: undefined }));

    (async () => {
      try {
        const loaded: LoadedSweep[] = [];
        for (const sw of sweeps) {
          if (cancelled) return;
          // IZeroClampSeries (zero-current clamp) has no stimulus. Writers keep
          // the file valid by pointing the stimulus reference back at the
          // response series with a (-1,-1) sentinel (pynwb: "set them to the
          // same TimeSeries to keep the I/O happy"), so naively loading the
          // stimulus side duplicates the response into a bogus "stimulus" panel.
          // Detect it from the response neurodata_type (authoritative, and
          // independent of whatever the producer wrote on the stimulus side),
          // with the stimulus-points-at-response path equality as a cheap
          // fallback. When detected, skip the stimulus load entirely.
          const responseGroup = await getHdf5Group(nwbUrl, sw.response.path);
          const responseType = String(
            responseGroup?.attrs?.neurodata_type ?? "",
          );
          const noStimulus =
            responseType === "IZeroClampSeries" ||
            sw.stimulus.path === sw.response.path;
          const response = await loadOneSide(nwbUrl, sw.response);
          const stimulus = noStimulus
            ? null
            : await loadOneSide(nwbUrl, sw.stimulus);
          loaded.push({
            irtRow: sw.irtRow,
            seqRow: sw.seqRow,
            repRow: sw.repRow,
            condRow: sw.condRow,
            electrode: sw.electrode,
            cell: sw.cell,
            protocolLabel: sw.protocolLabel,
            response,
            stimulus,
            noStimulus,
          });
          // incremental: push partial results so the plot updates as sweeps arrive
          if (!cancelled) {
            setResult({
              loading: loaded.length < sweeps.length,
              loaded: [...loaded],
            });
          }
        }
      } catch (exc: any) {
        if (!cancelled)
          setResult((r) => ({
            ...r,
            loading: false,
            error: exc?.message || String(exc),
          }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nwbUrl, sweepsKey]);

  return result;
}
