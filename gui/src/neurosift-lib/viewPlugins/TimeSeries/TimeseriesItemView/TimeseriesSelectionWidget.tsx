import { FunctionComponent } from "react";
import {
  useTimeRange,
  useTimeseriesSelection,
} from "../../../contexts/context-timeseries-selection";
import PlayControl from "./PlayControl";

type Props = {
  // none
};

const TimeseriesSelectionWidget: FunctionComponent<Props> = () => {
  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();
  const { currentTime } = useTimeseriesSelection();
  return (
    <div>
      <pre>select: {formatTimestamp(currentTime)}</pre>
      <pre>start: {formatTimestamp(visibleStartTimeSec)}</pre>
      <pre>end: {formatTimestamp(visibleEndTimeSec)}</pre>
      <div>&nbsp;</div>
      <PlayControl />
    </div>
  );
};

const formatTimestamp = (t: number | undefined) => {
  if (t === undefined) return "";
  const numDays = Math.floor(t / (24 * 3600));
  const numHours = Math.floor((t - numDays * 24 * 3600) / 3600);
  const numMinutes = Math.floor(
    (t - numDays * 24 * 3600 - numHours * 3600) / 60,
  );
  const numSeconds = Math.floor(
    t - numDays * 24 * 3600 - numHours * 3600 - numMinutes * 60,
  );
  const numMilliseconds = Math.floor(
    (t - numDays * 24 * 3600 - numHours * 3600 - numMinutes * 60 - numSeconds) *
      1000,
  );
  const numMicroseconds = Math.floor(
    (t -
      numDays * 24 * 3600 -
      numHours * 3600 -
      numMinutes * 60 -
      numSeconds -
      numMilliseconds / 1000) *
      1000000,
  );
  let ret = "";
  if (numDays > 0) ret += `${pad(numDays, 2)}d `;
  ret += `${pad(numHours, 2)}h `;
  ret += `${pad(numMinutes, 2)}m `;
  ret += `${pad(numSeconds, 2)}s `;
  ret += `${pad(numMilliseconds, 3)}ms `;
  ret += `${pad(numMicroseconds, 3)}µs `;
  return ret;
};

const pad = (num: number, len: number) => {
  let ret = num + "";
  while (ret.length < len) ret = "0" + ret;
  return ret;
};

export default TimeseriesSelectionWidget;
