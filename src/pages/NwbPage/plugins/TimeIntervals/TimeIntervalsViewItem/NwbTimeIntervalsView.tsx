/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useState } from "react";
import {
  getNwbDatasetData,
  useNwbDatasetData,
  useNwbGroup,
} from "@nwbInterface";
import NwbTimeIntervalsWidget from "./NwbTimeIntervalsWidget";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";

type Props = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
};

const NwbTimeIntervalsView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  // const group = useGroup(nwbFile, path);
  const startTimeData = useNwbDatasetData(nwbUrl, `${path}/start_time`);
  const stopTimeData = useNwbDatasetData(nwbUrl, `${path}/stop_time`);

  const { labelFieldName, labelData } = useLabelData(
    nwbUrl,
    path,
    startTimeData?.length,
  );

  const { initializeTimeseriesSelection, setVisibleTimeRange } =
    useTimeseriesSelection();

  useEffect(() => {
    if (!startTimeData || !stopTimeData) return;
    const t1 = compute_min(startTimeData);
    const t2 = compute_max(stopTimeData);
    initializeTimeseriesSelection(t1, t2);
    const t2b = Math.min(t1 + 100, t2);
    setVisibleTimeRange(t1, t2b);
  }, [
    startTimeData,
    stopTimeData,
    initializeTimeseriesSelection,
    setVisibleTimeRange,
  ]);

  if (!startTimeData || !stopTimeData) {
    return <div>loading data...</div>;
  }

  const bottomBarHeight = 50;

  return (
    <div style={{ position: "relative", width, height }}>
      <div
        style={{
          position: "absolute",
          width,
          height: height - bottomBarHeight,
          top: 0,
        }}
      >
        <NwbTimeIntervalsWidget
          labels={labelData}
          startTimes={startTimeData}
          stopTimes={stopTimeData}
          width={width}
          height={height - bottomBarHeight}
        />
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: bottomBarHeight,
          top: height - bottomBarHeight,
        }}
      >
        {labelFieldName && (
          <div style={{ paddingLeft: 10 }}>Label: {labelFieldName}</div>
        )}
      </div>
    </div>
  );
};

const useLabelData = (
  nwbUrl: string,
  path: string,
  numRows: number | undefined,
) => {
  const group = useNwbGroup(nwbUrl, path);
  const [labelFieldName, setLabelFieldName] = useState<string | undefined>(
    undefined,
  );
  const [labelData, setLabelData] = useState<string[] | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    setLabelFieldName(undefined);
    setLabelData(undefined);
    const load = async () => {
      if (!group) return;
      const colnames = (await group.attrs["colnames"]) || [];
      const scores: { colname: string; score: number; values: string[] }[] = [];
      for (const colname of colnames) {
        const d = await getNwbDatasetData(nwbUrl, `${path}/${colname}`, {});
        if (!d)
          throw Error(`Unable to get dataset data for ${path}/${colname}`);
        if (canceled) return;
        try {
          const values = Array.from(d) as any as string[];
          if (values.length !== numRows) continue; // restrict to columns with same number of rows as time columns
          const distinctValues = getDistinctValues(values);
          if (
            distinctValues.length > 1 &&
            distinctValues.length <= values.length / 4
          ) {
            const score = Math.abs(distinctValues.length - 10); // we target 10 distinct values
            scores.push({ colname, score, values });
          }
        } catch (err) {
          console.warn(err);
        }
      }
      scores.sort((a, b) => a.score - b.score);
      if (scores.length > 0) {
        setLabelFieldName(scores[0].colname);
        setLabelData(scores[0].values);
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [group, nwbUrl, path, numRows]);
  return { labelFieldName, labelData };
};

const getDistinctValues = (values: string[]) => {
  const ret = new Set<string>();
  for (const val of values) {
    ret.add(val);
  }
  return Array.from(ret).sort();
};

const compute_min = (data: Float32Array) => {
  let min = data[0];
  for (let i = 1; i < data.length; i++) {
    if (data[i] < min) min = data[i];
  }
  return min;
};

const compute_max = (data: Float32Array) => {
  let max = data[0];
  for (let i = 1; i < data.length; i++) {
    if (data[i] > max) max = data[i];
  }
  return max;
};

export default NwbTimeIntervalsView;
