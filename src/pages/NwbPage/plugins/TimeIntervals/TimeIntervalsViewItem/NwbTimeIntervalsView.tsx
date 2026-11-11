/* eslint-disable @typescript-eslint/no-explicit-any */
import { intervalsTimeRange } from "./intervalsTimeRange";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import {
  getHdf5DatasetData,
  useHdf5DatasetData,
  useHdf5Group,
} from "@hdf5Interface";
import NwbTimeIntervalsWidget from "./NwbTimeIntervalsWidget";
import TimeIntervalsPlotly from "./TimeIntervalsPlotly";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { EmptyState, LoadingState, SegmentedControl, Select } from "@ui";
import TimeView, {
  TIME_VIEW_CHROME,
  TIME_VIEW_INSET,
} from "../../common/TimeView";
import "./NwbTimeIntervalsView.css";

type Props = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
};

type ViewMode = "canvas" | "plotly";

const NwbTimeIntervalsView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  // Default to Plotly view now that we've fixed the hover functionality
  const [viewMode, setViewMode] = useState<ViewMode>("plotly");

  // Get all hooks at the top level to avoid React hooks rules violations
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

  // Get all timeseriesSelection hooks
  const { initializeTimeseriesSelection, setVisibleTimeRange } =
    useTimeseriesSelection();

  const { labelData, allDistinctLabels, availableColumns, autoSelectedColumn } =
    useLabelData(nwbUrl, path, startTimeData?.length, selectedColumn);

  // Load additional data columns for hover information in Plotly view
  const additionalData = useMemo(() => {
    if (!startTimeData) return {};

    const result: Record<string, any[]> = {};

    // Add all available columns to the additional data
    availableColumns.forEach((col) => {
      if (col.values.length === startTimeData.length) {
        result[col.name] = col.values;
      }
    });

    return result;
  }, [availableColumns, startTimeData]);

  // Overall range of the intervals, ignoring NaN start or stop times.
  const timeRange = useMemo(
    () =>
      startTimeData && stopTimeData
        ? intervalsTimeRange(startTimeData, stopTimeData)
        : undefined,
    [startTimeData, stopTimeData],
  );

  useEffect(() => {
    if (!timeRange) return;
    const t1 = timeRange.startTime;
    const t2 = timeRange.endTime;
    const t2b = Math.min(t1 + 100, t2);
    initializeTimeseriesSelection({
      startTimeSec: t1,
      endTimeSec: t2,
      initialVisibleStartTimeSec: t1,
      initialVisibleEndTimeSec: t2b,
    });
  }, [timeRange, initializeTimeseriesSelection, setVisibleTimeRange]);

  if (!startTimeData || !stopTimeData)
    return <LoadingState label="Reading the intervals" phase="loading" />;
  if (!timeRange)
    return (
      <EmptyState title="No times to draw">
        This table has no finite start or stop times to display.
      </EmptyState>
    );

  const plotHeight = Math.max(height - TIME_VIEW_CHROME, 200);
  const n = startTimeData.length;
  const seconds = (s: number) =>
    s.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <TimeView
      label={path.split("/").pop() || path}
      summary={`${n.toLocaleString("en-US")} interval${n === 1 ? "" : "s"} · ${seconds(timeRange.startTime)}–${seconds(timeRange.endTime)} s`}
      controls={
        <>
          {availableColumns.length > 0 && (
            <div className="ns-time-group intervals-label">
              <span className="ns-time-label" aria-hidden="true">
                Label by
              </span>
              <Select
                label="Label by"
                hideLabel
                size="sm"
                value={selectedColumn || autoSelectedColumn || ""}
                onChange={(value) => setSelectedColumn(value || undefined)}
                options={availableColumns.map((col) => ({
                  value: col.name,
                  label: `${col.name} (${col.distinctValueCount} values)`,
                }))}
              />
            </div>
          )}
          <SegmentedControl
            label="Renderer"
            size="sm"
            value={viewMode}
            onChange={(mode) => setViewMode(mode as ViewMode)}
            options={[
              { value: "canvas", label: "Canvas" },
              { value: "plotly", label: "Plotly" },
            ]}
          />
        </>
      }
    >
      {viewMode === "canvas" ? (
        <NwbTimeIntervalsWidget
          labels={labelData}
          allDistinctLabels={allDistinctLabels}
          startTimes={startTimeData}
          stopTimes={stopTimeData}
          width={width - TIME_VIEW_INSET}
          height={plotHeight}
        />
      ) : (
        <TimeIntervalsPlotly
          labels={labelData}
          allDistinctLabels={allDistinctLabels}
          startTimes={startTimeData}
          stopTimes={stopTimeData}
          width={width - TIME_VIEW_INSET}
          height={plotHeight}
          additionalData={additionalData}
        />
      )}
    </TimeView>
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
  const [allDistinctLabels, setAllDistinctLabels] = useState<string[]>([]);
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
          // Compute all distinct labels from the full dataset
          setAllDistinctLabels(getDistinctValues(selectedColumn.values));
        }
      } else if (numRows) {
        // If no valid categorical columns found but we know the number of rows,
        // provide a default label array with the same constant value for all intervals
        setLabelFieldName("default");
        // Create an array filled with "Interval" strings
        setLabelData(Array(numRows).fill("Interval"));
        setAllDistinctLabels(["Interval"]);
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [group, nwbUrl, path, numRows, userSelectedColumn]);
  return {
    labelFieldName,
    labelData,
    allDistinctLabels,
    availableColumns,
    autoSelectedColumn,
  };
};

const getDistinctValues = (values: string[]) => {
  const ret = new Set<string>();
  for (const val of values) {
    ret.add(val);
  }
  return Array.from(ret).sort();
};

export default NwbTimeIntervalsView;
