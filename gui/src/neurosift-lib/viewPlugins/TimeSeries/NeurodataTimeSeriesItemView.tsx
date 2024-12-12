import { FunctionComponent, useEffect, useMemo, useState } from "react";
import NwbTimeseriesView, {
  TimeseriesAnnotation,
} from "./TimeseriesItemView/NwbTimeseriesView";
import TimeSeriesViewToolbar, {
  TimeSeriesViewOpts,
} from "./TimeSeriesViewToolbar";
import { SpikeTrainsClient } from "../Units/DirectRasterPlotUnitsItemView";
import TabWidget from "../../components/TabWidget";
import { useNwbFile } from "../../misc/NwbFileContext";
import MultiscaleTimeSeriesView from "./MultiscaleTimeSeriesView";
import { useDataset } from "../../misc/hooks";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;

  spikeTrainsClient?: SpikeTrainsClient;

  initialShowAllChannels?: boolean;
  initialNumVisibleChannels?: number;
  initialVisibleStartChannel?: number;
  initialChannelSeparation?: number;
  annotations?: TimeseriesAnnotation[];
  yLabel?: string;
  showTimeseriesToolbar?: boolean;
  showTimeseriesNavbar?: boolean;
  showBottomToolbar?: boolean;
};

const tabs = [
  {
    id: "timeseries",
    label: "TimeSeries",
    closeable: false,
  },
  {
    id: "multiscale",
    label: "Multiscale (WIP)",
    closeable: false,
  },
];

// for future possibly
export const NeurodataTimeSeriesItemViewNext: FunctionComponent<Props> = ({
  width,
  height,
  path,
  spikeTrainsClient,
  initialShowAllChannels,
  initialNumVisibleChannels,
  initialVisibleStartChannel,
  initialChannelSeparation,
}) => {
  const [currentTabId, setCurrentTabId] = useState("timeseries");

  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const nwbUrl = useMemo(() => {
    return (nwbFile.sourceUrls || [])[0] || "";
  }, [nwbFile]);

  return (
    <TabWidget
      width={width}
      height={height}
      tabs={tabs}
      currentTabId={currentTabId}
      setCurrentTabId={setCurrentTabId}
    >
      <NeurodataTimeSeriesItemView
        width={0}
        height={0}
        path={path}
        spikeTrainsClient={spikeTrainsClient}
        initialShowAllChannels={initialShowAllChannels}
        initialNumVisibleChannels={initialNumVisibleChannels}
        initialVisibleStartChannel={initialVisibleStartChannel}
        initialChannelSeparation={initialChannelSeparation}
      />
      {nwbUrl ? (
        <MultiscaleTimeSeriesView
          width={0}
          height={0}
          path={path}
          nwbUrl={nwbUrl}
        />
      ) : (
        <div />
      )}
    </TabWidget>
  );
};

const NeurodataTimeSeriesItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  spikeTrainsClient,
  initialShowAllChannels,
  initialNumVisibleChannels,
  initialVisibleStartChannel,
  initialChannelSeparation,
  annotations,
  yLabel,
  showTimeseriesToolbar,
  showTimeseriesNavbar,
  showBottomToolbar = true,
}) => {
  const bottomToolBarHeight = showBottomToolbar ? 30 : 0;
  const totalNumChannels = useTotalNumChannelsForTimeSeries(path);
  // important to start with only 1 visible channel --- if we want to default to more, do it in a useEffect after we figure out the number of channels in the dataset
  const [timeSeriesViewOpts, setTimeSeriesViewOpts] =
    useState<TimeSeriesViewOpts>({
      numVisibleChannels: 1,
      visibleStartChannel: 0,
      autoChannelSeparation:
        initialChannelSeparation !== undefined ? initialChannelSeparation : 0.5,
      colorChannels: true,
    });
  useEffect(() => {
    setTimeSeriesViewOpts((prev) => {
      const newX = { ...prev };
      if (initialNumVisibleChannels !== undefined) {
        newX.numVisibleChannels = initialNumVisibleChannels;
      }
      if (initialVisibleStartChannel !== undefined) {
        newX.visibleStartChannel = initialVisibleStartChannel;
      }
      if (initialChannelSeparation !== undefined) {
        newX.autoChannelSeparation = initialChannelSeparation;
      }
      if (initialShowAllChannels) {
        newX.numVisibleChannels = totalNumChannels || 1;
      }
      return newX;
    });
  }, [
    initialNumVisibleChannels,
    initialVisibleStartChannel,
    initialChannelSeparation,
    initialShowAllChannels,
    totalNumChannels,
  ]);
  useEffect(() => {
    setTimeSeriesViewOpts((prev) => {
      const newNumVisibleChannels =
        initialShowAllChannels && totalNumChannels ? totalNumChannels : 1;
      if (newNumVisibleChannels !== prev.numVisibleChannels) {
        return {
          ...prev,
          numVisibleChannels: newNumVisibleChannels,
        };
      } else return prev;
    });
  }, [totalNumChannels, initialShowAllChannels]);
  const visibleChannelsRange = useMemo(() => {
    const { numVisibleChannels, visibleStartChannel } = timeSeriesViewOpts;
    return [visibleStartChannel, visibleStartChannel + numVisibleChannels] as [
      number,
      number,
    ];
  }, [timeSeriesViewOpts]);
  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width,
          height: height - bottomToolBarHeight,
        }}
      >
        <NwbTimeseriesView
          width={width}
          height={height - bottomToolBarHeight}
          objectPath={path}
          visibleChannelsRange={visibleChannelsRange}
          autoChannelSeparation={timeSeriesViewOpts.autoChannelSeparation}
          colorChannels={timeSeriesViewOpts.colorChannels}
          applyConversion={timeSeriesViewOpts.applyConversion}
          spikeTrainsClient={spikeTrainsClient}
          startZoomedOut={true}
          annotations={annotations}
          yLabel={yLabel}
          showTimeseriesToolbar={showTimeseriesToolbar}
          showTimeseriesNavbar={showTimeseriesNavbar}
        />
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: bottomToolBarHeight,
          top: height - bottomToolBarHeight,
        }}
      >
        {showBottomToolbar && (
          <TimeSeriesViewToolbar
            width={width}
            height={bottomToolBarHeight}
            objectPath={path}
            timeSeriesViewOpts={timeSeriesViewOpts}
            setTimeSeriesViewOpts={setTimeSeriesViewOpts}
          />
        )}
      </div>
    </div>
  );
};

const useTotalNumChannelsForTimeSeries = (path: string) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");
  const ds = useDataset(nwbFile, path + "/data");
  return ds ? ds.shape[1] || 1 : undefined;
};

export default NeurodataTimeSeriesItemView;
