import type { SimpleTimeseriesInfo } from "./types";

const seconds = (s: number) =>
  s.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** One line on what the series holds: its time span, rate and channels. */
export function timeseriesSummary(
  info: Pick<
    SimpleTimeseriesInfo,
    | "timeseriesStartTime"
    | "timeseriesDuration"
    | "samplingFrequency"
    | "totalNumChannels"
  >,
): string {
  const start = info.timeseriesStartTime;
  const end = start + info.timeseriesDuration;
  const rate = info.samplingFrequency
    ? `${info.samplingFrequency.toLocaleString("en-US", { maximumFractionDigits: 2 })} Hz`
    : undefined;
  const n = info.totalNumChannels;
  const channels = `${n.toLocaleString("en-US")} channel${n === 1 ? "" : "s"}`;
  return [`${seconds(start)}–${seconds(end)} s`, rate, channels]
    .filter(Boolean)
    .join(" · ");
}
