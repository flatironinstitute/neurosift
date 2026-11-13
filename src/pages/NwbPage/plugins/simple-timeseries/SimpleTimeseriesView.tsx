import { useHdf5Group } from "@hdf5Interface";
import {
  ChannelWindow,
  clampWindow,
  LoadingState,
  SegmentedControl,
  Slider,
  TooMuchData,
} from "@ui";
import ViewError from "@components/ViewError/ViewError";
import { useCssVars } from "@components/useCssVars";
import {
  useLinkedSettings,
  useShareSettings,
} from "@shared/shareLink/useShareSettings";
import {
  formatRun,
  parseNumber,
  parseRun,
  type Setting,
} from "@shared/shareLink/linkSettings";
import {
  FunctionComponent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import TimeView, { TIME_VIEW_INSET } from "../common/TimeView";
import { covers } from "../common/playback";
import { useWindowPlayback } from "../common/usePlayback";
import { useTimeWindow } from "../common/useTimeWindow";
import { useTimeseriesData } from "./hooks";
import LabeledEventsPlot from "./LabeledEventsPlot";
import TimeseriesPlot from "./TimeseriesPlot";
import TimeseriesPlotTSV2 from "./TimeseriesPlotTSV2";
import { timeseriesSummary } from "./timeseriesSummary";
import { Props } from "./types";
import "./SimpleTimeseriesView.css";

/** What a link carries for traces: the channels shown, their separation and the renderer. */
const timeseriesSettings = (o: {
  numChannels: number;
  first: number;
  count: number;
  separation: number;
  renderer: string;
}): Setting[] => {
  return [
    {
      key: "channels",
      value: formatRun(o.first, o.count),
      default: formatRun(0, Math.min(4, o.numChannels)),
      label: "channels",
    },
    {
      key: "separation",
      value: String(o.separation),
      default: "0",
      label: "separation",
    },
    {
      key: "renderer",
      value: o.renderer,
      default: "canvas",
      label: "the renderer",
    },
  ];
};

/** Traces of a TimeSeries: the shared time and channel windows, then Neurosift's plot. */
const CanvasFrame = ({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) => {
  const ref = useCssVars<HTMLDivElement>({ "--plot-height": height });
  return (
    <div ref={ref} className="timeseries-canvas">
      {children}
    </div>
  );
};

export const SimpleTimeseriesView: FunctionComponent<
  Props & { condensed?: boolean }
> = ({ nwbUrl, path, width = 700, condensed = false }) => {
  const linked = useLinkedSettings();
  const [renderer, setRenderer] = useState(() =>
    linked.get("renderer") === "plotly" ? "plotly" : "canvas",
  );
  const [channelSeparation, setChannelSeparation] = useState(() => {
    const value = parseNumber(linked.get("separation"));
    return value !== undefined && value >= 0 && value <= 10 ? value : 0;
  });
  const time = useTimeWindow();
  const playback = useWindowPlayback();
  const lookahead = playback.playing
    ? 2 * Math.max(1, Number(playback.speed))
    : 0;

  const {
    timeseriesClient,
    error,
    isLoading,
    info,
    loadedTimestamps,
    loadedData,
    loadedRange,
    zoomInRequired,
    drawAnyway,
    visibleChannelsStart,
    setVisibleChannelsStart,
    numVisibleChannels,
    setNumVisibleChannels,
  } = useTimeseriesData(nwbUrl, path, lookahead);

  // After the data hook picks its first channels, a link's channels win.
  const numChannels = timeseriesClient?.numChannels;
  useEffect(() => {
    if (!numChannels) return;
    const run = parseRun(linked.get("channels"));
    if (!run || run.first >= numChannels) return;
    setVisibleChannelsStart(run.first);
    setNumVisibleChannels(Math.min(run.count, numChannels - run.first));
  }, [numChannels, linked, setVisibleChannelsStart, setNumVisibleChannels]);
  useShareSettings(
    numChannels
      ? timeseriesSettings({
          numChannels,
          first: visibleChannelsStart,
          count: numVisibleChannels,
          separation: channelSeparation,
          renderer,
        })
      : [],
  );

  const group = useHdf5Group(nwbUrl, path);
  const channelNames = useMemo(() => {
    if (!group || !timeseriesClient) return undefined;
    if (
      ["SpatialSeries", "PoseEstimationSeries"].includes(
        group.attrs?.neurodata_type,
      )
    ) {
      const dimensions = ["X", "Y", "Z"];
      return dimensions.slice(0, timeseriesClient.numChannels);
    }
    return undefined;
  }, [group, timeseriesClient]);

  if (error) return <ViewError what="the time series" error={error} />;
  if (!info || !timeseriesClient)
    return <LoadingState label="Reading the time series" phase="loading" />;

  const name = path.split("/").pop() || path;
  const height = condensed ? 200 : 350;
  const visibleStart = time.value.start;
  const visibleEnd = time.value.start + time.value.duration;
  const channels = info.totalNumChannels;
  const holding =
    !zoomInRequired &&
    !covers(loadedRange, visibleStart, visibleEnd, timeseriesClient.endTime);
  const plural = (n: number, word: string) =>
    `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

  const plotProps = {
    timestamps: loadedTimestamps,
    data: loadedData,
    visibleStartTime: visibleStart,
    visibleEndTime: visibleEnd,
    channelNames,
    channelSeparation,
    width: width - TIME_VIEW_INSET,
    height,
    zoomInRequired: false,
    onVisibleTimeChange: (start: number, end: number) =>
      time.onChange(
        clampWindow({ start, duration: end - start }, time.session),
      ),
  };

  let plot;
  if (zoomInRequired)
    plot = (
      <TooMuchData
        zoomLabel="Zoom in"
        onZoom={() =>
          time.onChange({
            start: visibleStart + time.value.duration / 4,
            duration: time.value.duration / 2,
          })
        }
        onDrawAnyway={drawAnyway}
      >
        {`This window holds ${plural(numVisibleChannels, "channel")} at ${info.samplingFrequency.toLocaleString("en-US")} Hz for ${time.value.duration.toLocaleString("en-US", { maximumFractionDigits: 2 })} s, more than Neurosift draws at once. Zoom in, drag across the overview above to pick a shorter stretch, or draw it anyway.`}
      </TooMuchData>
    );
  else if (timeseriesClient.isLabeledEvents())
    plot = (
      <LabeledEventsPlot
        timestamps={loadedTimestamps}
        data={loadedData}
        labels={timeseriesClient.getLabels()}
        visibleStartTime={visibleStart}
        visibleEndTime={visibleEnd}
      />
    );
  else if (renderer === "plotly") plot = <TimeseriesPlot {...plotProps} />;
  else
    plot = (
      <CanvasFrame height={height}>
        <TimeseriesPlotTSV2 {...plotProps} />
      </CanvasFrame>
    );

  return (
    <TimeView
      label={name}
      summary={timeseriesSummary(info)}
      busy={isLoading}
      playback={condensed ? undefined : playback}
      holding={holding}
      controls={
        <>
          {channels > 1 && (
            <ChannelWindow
              label="Channels"
              total={channels}
              value={{
                first: visibleChannelsStart || 0,
                count: numVisibleChannels,
              }}
              onChange={({ first, count }) => {
                setVisibleChannelsStart(first);
                setNumVisibleChannels(count);
              }}
            />
          )}
          {channels > 1 && numVisibleChannels > 1 && (
            <div className="timeseries-separation">
              <Slider
                label="Separation"
                min={0}
                max={10}
                step={1}
                unit="σ"
                unitName="standard deviations"
                showValue
                showField={false}
                value={channelSeparation}
                onChange={setChannelSeparation}
              />
            </div>
          )}
          {!timeseriesClient.isLabeledEvents() && (
            <SegmentedControl
              label="Renderer"
              size="sm"
              value={renderer}
              onChange={setRenderer}
              options={[
                { value: "canvas", label: "Canvas" },
                { value: "plotly", label: "Plotly" },
              ]}
            />
          )}
        </>
      }
      condensed={condensed}
    >
      {plot}
    </TimeView>
  );
};
