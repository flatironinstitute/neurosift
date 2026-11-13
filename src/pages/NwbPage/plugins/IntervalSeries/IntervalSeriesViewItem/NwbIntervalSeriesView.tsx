import { FunctionComponent, useEffect, useMemo } from "react";
import { useHdf5DatasetData } from "@hdf5Interface";
import NwbTimeIntervalsWidget from "../../TimeIntervals/TimeIntervalsViewItem/NwbTimeIntervalsWidget";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { LoadingState } from "@ui";
import TimeView, {
  TIME_VIEW_CHROME,
  TIME_VIEW_INSET,
} from "../../common/TimeView";

type Props = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
};

const NwbIntervalSeriesView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  // Fetch timestamps and data
  const { data: timestamps } = useHdf5DatasetData(nwbUrl, `${path}/timestamps`);
  const { data: intervalData } = useHdf5DatasetData(nwbUrl, `${path}/data`);

  // Transform data into start_times and stop_times
  const { startTimes, stopTimes } = useMemo(() => {
    if (!timestamps || !intervalData) return { startTimes: [], stopTimes: [] };

    const starts: number[] = [];
    const stops: number[] = [];

    for (let i = 0; i < intervalData.length; i++) {
      if (intervalData[i] > 0) {
        starts.push(timestamps[i]);
      } else if (intervalData[i] < 0) {
        stops.push(timestamps[i]);
      }
    }

    return { startTimes: starts, stopTimes: stops };
  }, [timestamps, intervalData]);

  const { initializeTimeseriesSelection } = useTimeseriesSelection();

  useEffect(() => {
    if (!timestamps || timestamps.length === 0) return;
    const t1 = timestamps[0];
    const t2 = timestamps[timestamps.length - 1];
    const t2b = Math.min(t1 + 100, t2);
    initializeTimeseriesSelection({
      startTimeSec: t1,
      endTimeSec: t2,
      initialVisibleStartTimeSec: t1,
      initialVisibleEndTimeSec: t2b,
    });
  }, [timestamps, initializeTimeseriesSelection]);

  if (!timestamps || !intervalData) {
    return <LoadingState label="Reading the intervals" phase="loading" />;
  }

  return (
    <TimeView
      label={path.split("/").pop() || path}
      summary={`${startTimes.length.toLocaleString("en-US")} interval${startTimes.length === 1 ? "" : "s"}`}
    >
      <NwbTimeIntervalsWidget
        labels={undefined}
        allDistinctLabels={[]}
        startTimes={startTimes}
        stopTimes={stopTimes}
        width={width - TIME_VIEW_INSET}
        height={Math.max(height - TIME_VIEW_CHROME, 200)}
      />
    </TimeView>
  );
};

export default NwbIntervalSeriesView;
