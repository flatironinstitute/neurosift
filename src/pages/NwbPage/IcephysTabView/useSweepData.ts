/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { getHdf5Dataset, getHdf5DatasetData } from "../hdf5Interface";
import { ResolvedSweep } from "./useChain";

export type SweepTrace = {
  t: Float32Array;
  y: Float32Array;
  unit: string; // SI unit string from the data dataset's NWB `unit` attr
};

export type LoadedSweep = {
  irtRow: number;
  response: SweepTrace;
  stimulus: SweepTrace;
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

  const raw = (await getHdf5DatasetData(nwbUrl, `${side.path}/data`, {
    slice: [[side.idxStart, side.idxStart + side.count]],
  })) as any;
  if (!raw) throw new Error(`failed to load slice for ${side.path}`);

  const n = side.count;
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
    const tsRaw = (await getHdf5DatasetData(
      nwbUrl,
      `${side.path}/timestamps`,
      { slice: [[side.idxStart, side.idxStart + side.count]] },
    )) as any;
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
          const [response, stimulus] = await Promise.all([
            loadOneSide(nwbUrl, sw.response),
            loadOneSide(nwbUrl, sw.stimulus),
          ]);
          loaded.push({ irtRow: sw.irtRow, response, stimulus });
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
