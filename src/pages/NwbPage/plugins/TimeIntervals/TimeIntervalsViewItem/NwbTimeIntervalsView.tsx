/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useState } from "react";
import {
  getHdf5DatasetData,
  useHdf5DatasetData,
  useHdf5Group,
} from "@hdf5Interface";
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
  const { data: startTimeData } = useHdf5DatasetData(
    nwbUrl,
    `${path}/start_time`,
  );
  const { data: stopTimeData } = useHdf5DatasetData(
    nwbUrl,
    `${path}/stop_time`,
  );

  const [selectedColumn, setSelectedColumn] = useState<string | undefined>(
    undefined,
  );
  const { labelData, availableColumns, autoSelectedColumn } = useLabelData(
    nwbUrl,
    path,
    startTimeData?.length,
    selectedColumn,
  );

  const { initializeTimeseriesSelection, setVisibleTimeRange } =
    useTimeseriesSelection();

  useEffect(() => {
    if (!startTimeData || !stopTimeData) return;
    const t1 = compute_min(startTimeData);
    const t2 = compute_max(stopTimeData);
    const t2b = Math.min(t1 + 100, t2);
    initializeTimeseriesSelection({
      startTimeSec: t1,
      endTimeSec: t2,
      initialVisibleStartTimeSec: t1,
      initialVisibleEndTimeSec: t2b,
    });
  }, [
    startTimeData,
    stopTimeData,
    initializeTimeseriesSelection,
    setVisibleTimeRange,
  ]);

  if (!startTimeData || !stopTimeData) {
    return <div>loading data (NwbTimeIntervalsView)...</div>;
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: 10,
            gap: 10,
          }}
        >
          <div>Label:</div>
          {availableColumns.length > 0 ? (
            <select
              value={selectedColumn || autoSelectedColumn || ""}
              onChange={(e) => setSelectedColumn(e.target.value || undefined)}
              style={{ minWidth: 150 }}
            >
              {availableColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.distinctValueCount} values)
                </option>
              ))}
            </select>
          ) : (
            <span>No valid columns found</span>
          )}
        </div>
      </div>
    </div>
  );
};

type ColumnInfo = {
  name: string;
  score: number;
  values: string[];
  distinctValueCount: number;
};

const useLabelData = (
  nwbUrl: string,
  path: string,
  numRows: number | undefined,
  userSelectedColumn?: string,
) => {
  const group = useHdf5Group(nwbUrl, path);
  const [labelFieldName, setLabelFieldName] = useState<string | undefined>(
    undefined,
  );
  const [labelData, setLabelData] = useState<string[] | undefined>(undefined);
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [autoSelectedColumn, setAutoSelectedColumn] = useState<
    string | undefined
  >(undefined);
  useEffect(() => {
    let canceled = false;
    setLabelFieldName(undefined);
    setLabelData(undefined);
    const load = async () => {
      if (!group) return;
      const colnames = (await group.attrs["colnames"]) || [];
      const validColumns: ColumnInfo[] = [];
      for (const colname of colnames) {
        const d = await getHdf5DatasetData(nwbUrl, `${path}/${colname}`, {});
        if (!d)
          throw Error(`Unable to get dataset data for ${path}/${colname}`);
        if (canceled) return;
        try {
          const values = Array.from(d) as any as string[];
          if (values.length !== numRows) continue; // restrict to columns with same number of rows as time columns
          const distinctValues = getDistinctValues(values);
          if (
            distinctValues.length > 1 &&
            (distinctValues.length <= values.length / 4 ||
              distinctValues.length <= 10)
          ) {
            const score = Math.abs(distinctValues.length - 10); // we target 10 distinct values
            validColumns.push({
              name: colname,
              score,
              values,
              distinctValueCount: distinctValues.length,
            });
          }
        } catch (err) {
          console.warn(err);
        }
      }

      validColumns.sort((a, b) => a.score - b.score);
      setAvailableColumns(validColumns);

      if (validColumns.length > 0) {
        setAutoSelectedColumn(validColumns[0].name);

        // Use user selected column if available and valid, otherwise use auto-selected
        const columnToUse =
          userSelectedColumn &&
          validColumns.find((c) => c.name === userSelectedColumn)
            ? userSelectedColumn
            : validColumns[0].name;

        const selectedColumn = validColumns.find((c) => c.name === columnToUse);
        if (selectedColumn) {
          setLabelFieldName(selectedColumn.name);
          setLabelData(selectedColumn.values);
        }
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [group, nwbUrl, path, numRows, userSelectedColumn]);
  return { labelFieldName, labelData, availableColumns, autoSelectedColumn };
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
