import { useHdf5DatasetData } from "@hdf5Interface";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { LoadingState } from "@ui";
import { FunctionComponent, useEffect, useMemo } from "react";
import TimeView, {
  TIME_VIEW_CHROME,
  TIME_VIEW_INSET,
} from "../common/TimeView";
import EventsWidget from "./EventsWidget";

type Props = {
  width?: number;
  height?: number;
  path: string;
  nwbUrl: string;
};

/** How many events, and over what span. */
const eventsSummary = (times: number[]) => {
  const n = times.length;
  const span =
    n > 0
      ? ` from ${times[0].toLocaleString("en-US", { maximumFractionDigits: 2 })} to ${times[n - 1].toLocaleString("en-US", { maximumFractionDigits: 2 })} s`
      : "";
  return `${n.toLocaleString("en-US")} event${n === 1 ? "" : "s"}${span}`;
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
    return <LoadingState label="Reading the event times" phase="loading" />;
  }

  return (
    <TimeView
      label={path.split("/").pop() || path}
      summary={eventsSummary(times)}
    >
      <EventsWidget
        times={times}
        width={width - TIME_VIEW_INSET}
        height={Math.max(height - TIME_VIEW_CHROME, 200)}
      />
    </TimeView>
  );
};

export default EventsPluginView;
