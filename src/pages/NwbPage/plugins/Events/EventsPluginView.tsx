import { useHdf5DatasetData } from "@hdf5Interface";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { FunctionComponent, useEffect, useMemo } from "react";
import EventsWidget from "./EventsWidget";

type Props = {
  width?: number;
  height?: number;
  path: string;
  nwbUrl: string;
};

const EventsPluginView: FunctionComponent<Props> = ({
  width = 0,
  height = 0,
  path,
  nwbUrl,
}) => {
  // Fetch timestamps and data
  const { data: timestamps } = useHdf5DatasetData(nwbUrl, `${path}/timestamps`);

  // Transform data into start_times and stop_times
  const { times } = useMemo(() => {
    if (!timestamps) return { times: undefined };

    return { times: Array.from(timestamps) as number[] };
  }, [timestamps]);

  const { initializeTimeseriesSelection } = useTimeseriesSelection();

  useEffect(() => {
    if (!times || times.length === 0) return;
    const t1 = times[0] || 0;
    const t2 = times[times.length - 1] || 0;
    const t2b = Math.min(t1 + 100, t2);
    initializeTimeseriesSelection({
      startTimeSec: t1,
      endTimeSec: t2,
      initialVisibleStartTimeSec: t1,
      initialVisibleEndTimeSec: t2b,
    });
  }, [times, initializeTimeseriesSelection]);

  if (!times) {
    return <div>Loading data (EventsPluginView)...</div>;
  }

  return (
    <div style={{ position: "relative", width, height }}>
      <EventsWidget times={times} width={width} height={height} />
    </div>
  );
};

export default EventsPluginView;
