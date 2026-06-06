/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { getHdf5Dataset, getHdf5DatasetData } from "../hdf5Interface";
import { ResolvedSweep } from "./useChain";

// One sweep's position in session time. Derived entirely from metadata
// (starting_time scalar + rate attr + count), so this is far cheaper than
// loading the trace samples: it works even for selections too large to render.
export type SweepTime = {
  irtRow: number;
  seqRow?: number;
  repRow?: number;
  condRow?: number;
  electrode?: string;
  protocolLabel?: string;
  // Custom intracellular_recordings columns by name, so the timeline can color
  // by a custom-column axis (mirroring the plot's Color by).
  custom?: Record<string, string>;
  startSec: number; // absolute time from session start
  durationSec: number; // count / rate (0 if unknown)
};

export type SweepTimesResult = {
  loading: boolean;
  times: SweepTime[];
  error?: string;
};

function scalar(v: any): number {
  if (v === null || v === undefined) return Number.NaN;
  if (Array.isArray(v) || ArrayBuffer.isView(v)) return Number((v as any)[0]);
  return Number(v);
}

async function readSweepTime(
  nwbUrl: string,
  sw: ResolvedSweep & { custom?: Record<string, string> },
): Promise<SweepTime | null> {
  const path = sw.response.path;

  // Regularly-sampled icephys: starting_time scalar + `rate` attribute.
  const startTimeDs = await getHdf5Dataset(nwbUrl, `${path}/starting_time`);
  let startSec = Number.NaN;
  let rate = Number.NaN;
  if (startTimeDs) {
    rate = Number(startTimeDs.attrs?.rate ?? Number.NaN);
    startSec = scalar(
      await getHdf5DatasetData(nwbUrl, `${path}/starting_time`, {}),
    );
  } else {
    // Irregularly-sampled: first timestamp is the start.
    const tsDs = await getHdf5Dataset(nwbUrl, `${path}/timestamps`);
    if (tsDs) {
      startSec = scalar(
        await getHdf5DatasetData(nwbUrl, `${path}/timestamps`, {
          slice: [[0, 1]],
        }),
      );
    }
  }

  if (!Number.isFinite(startSec)) return null;

  const count = sw.response.count;
  const durationSec =
    Number.isFinite(rate) && rate > 0 && Number.isFinite(count) && count > 0
      ? count / rate
      : 0;

  return {
    irtRow: sw.irtRow,
    seqRow: sw.seqRow,
    repRow: sw.repRow,
    condRow: sw.condRow,
    electrode: sw.electrode,
    protocolLabel: sw.protocolLabel,
    custom: sw.custom,
    startSec,
    durationSec,
  };
}

export function useSweepTimes(
  nwbUrl: string,
  sweeps: (ResolvedSweep & { custom?: Record<string, string> })[],
): SweepTimesResult {
  const [result, setResult] = useState<SweepTimesResult>({
    loading: false,
    times: [],
  });

  // Stable dep: sweep identity (row + response path) is enough; the metadata
  // we read is fixed per series.
  const key = JSON.stringify(sweeps.map((s) => [s.irtRow, s.response.path]));

  useEffect(() => {
    let cancelled = false;
    if (sweeps.length === 0) {
      setResult({ loading: false, times: [] });
      return;
    }
    setResult((r) => ({ ...r, loading: true, error: undefined }));

    (async () => {
      try {
        const out = await Promise.all(
          sweeps.map((sw) => readSweepTime(nwbUrl, sw)),
        );
        if (cancelled) return;
        // Preserve the incoming sweep order (matches the family overlay's
        // group ordering for consistent colors). x-position uses startSec.
        const times = out.filter(Boolean) as SweepTime[];
        setResult({ loading: false, times });
      } catch (exc: any) {
        if (!cancelled)
          setResult({
            loading: false,
            times: [],
            error: exc?.message || String(exc),
          });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nwbUrl, key]);

  return result;
}
