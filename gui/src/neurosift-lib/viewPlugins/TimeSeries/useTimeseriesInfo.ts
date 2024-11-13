import { RemoteH5FileX } from "../../remote-h5-file/index";
import { useEffect, useState } from "react";

export const getTimeseriesInfo = async (
  nwbFile: RemoteH5FileX,
  path: string,
) => {
  const es = await nwbFile.getGroup(path);
  if (!es) throw Error(`Electrical series not found: ${path}`);
  const dd = await nwbFile.getDataset(`${path}/data`);
  if (!dd) throw Error(`Dataset not found: ${path}/data`);
  const st = await nwbFile.getDataset(`${path}/starting_time`);
  if (st) {
    const rate = st.attrs["rate"];
    const duration = dd.shape[0] / rate;
    return { samplingRate: rate, duration };
  } else {
    const ts = await nwbFile.getDataset(`${path}/timestamps`);
    if (!ts)
      throw Error(
        `Dataset not found: ${path}/starting_time and ${path}/timestamps`,
      );
    const tsData = await nwbFile.getDatasetData(`${path}/timestamps`, {
      slice: [[0, 1000]],
    });
    if (!tsData) throw Error(`No data for timestamps: ${path}/timestamps`);
    const rate = estimateSamplingRateFromTimestamps(tsData as any as number[]);
    const endTsData = await nwbFile.getDatasetData(`${path}/timestamps`, {
      slice: [[dd.shape[0] - 1, dd.shape[0]]],
    });
    if (!endTsData) throw Error(`No data for timestamps: ${path}/timestamps`);
    const duration =
      (endTsData as any as number[])[0] - (tsData as any as number[])[0];
    return { samplingRate: rate, duration };
  }
};

export const useTimeSeriesInfo = (nwbFile: RemoteH5FileX, path: string) => {
  const [samplingRate, setSamplingRate] = useState<number | undefined | null>(
    undefined,
  );
  const [duration, setDuration] = useState<number | undefined | null>(
    undefined,
  );
  useEffect(() => {
    let canceled = false;
    setSamplingRate(undefined);
    (async () => {
      try {
        const { samplingRate, duration } = await getTimeseriesInfo(
          nwbFile,
          path,
        );
        if (canceled) return;
        setSamplingRate(samplingRate);
        setDuration(duration);
      } catch (err) {
        console.error(err);
        setSamplingRate(null);
        setDuration(null);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFile, path]);
  return { samplingRate, duration };
};

const estimateSamplingRateFromTimestamps = (timestamps: number[]) => {
  const diffs = timestamps
    .filter((t) => !isNaN(t))
    .slice(1)
    .map((t, i) => t - timestamps[i]);
  if (diffs.length === 0)
    throw Error("No diffs when estimating sampling rate from timestamps");
  const medianDiff = median(diffs);
  return 1 / medianDiff;
};

const median = (values: number[]) => {
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  if (n % 2 === 0) {
    return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  } else {
    return sorted[(n - 1) / 2];
  }
};

export default useTimeSeriesInfo;
