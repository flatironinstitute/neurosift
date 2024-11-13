import { FunctionComponent } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import useTimeSeriesInfo from "./useTimeseriesInfo";

type TimeSeriesLeftPanelComponentProps = {
  width: number;
  path: string;
};

const TimeSeriesLeftPanelComponent: FunctionComponent<
  TimeSeriesLeftPanelComponentProps
> = ({ path }) => {
  const nwbFile = useNwbFile();
  const { samplingRate, duration } = useTimeSeriesInfo(nwbFile, path);
  return (
    <>
      {samplingRate && (
        <div style={{ paddingTop: 8 }}>Rate: {samplingRate} Hz</div>
      )}
      {duration && (
        <div style={{ paddingTop: 8 }}>
          Duration: {durationString(duration)}
        </div>
      )}
    </>
  );
};

const durationString = (durationSeconds: number) => {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = Math.floor(durationSeconds % 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds} s`;
};

export default TimeSeriesLeftPanelComponent;
