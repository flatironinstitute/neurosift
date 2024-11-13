/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useState } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import { useDatasetData, useGroup } from "../../misc/hooks";
import NwbTimeIntervalsWidget from "./NwbTimeIntervalsWidget";

type Props = {
  width: number;
  height: number;
  path: string;
};

const NwbTimeIntervalsView: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is null");
  // const group = useGroup(nwbFile, path);
  const { data: startTimeData } = useDatasetData(nwbFile, `${path}/start_time`);
  const { data: stopTimeData } = useDatasetData(nwbFile, `${path}/stop_time`);

  const { labelFieldName, labelData } = useLabelData(
    nwbFile,
    path,
    startTimeData?.length,
  );

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
  nwbFile: any,
  path: string,
  numRows: number | undefined,
) => {
  const group = useGroup(nwbFile, path);
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
        const d = await nwbFile.getDatasetData(`${path}/${colname}`, {});
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
  }, [group, nwbFile, path, numRows]);
  return { labelFieldName, labelData };
};

const getDistinctValues = (values: string[]) => {
  const ret = new Set<string>();
  for (const val of values) {
    ret.add(val);
  }
  return Array.from(ret).sort();
};

export default NwbTimeIntervalsView;
