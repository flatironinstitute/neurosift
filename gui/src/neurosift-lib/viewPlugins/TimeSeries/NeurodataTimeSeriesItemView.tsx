import { FunctionComponent, useMemo, useState } from "react";
import NwbTimeseriesView from "./TimeseriesItemView/NwbTimeseriesView";
import TimeSeriesViewToolbar, {
  TimeSeriesViewOpts,
} from "./TimeSeriesViewToolbar";
import { SpikeTrainsClient } from "../Units/DirectRasterPlotUnitsItemView";
import TabWidget from "../../components/TabWidget";
import { useNwbFile } from "../../misc/NwbFileContext";
import MultiscaleTimeSeriesView from "./MultiscaleTimeSeriesView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;

  spikeTrainsClient?: SpikeTrainsClient;
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
}) => {
  const [currentTabId, setCurrentTabId] = useState("timeseries");

  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const nwbUrl = useMemo(() => {
    return (nwbFile.sourceUrls || [])[0];
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
}) => {
  const bottomToolBarHeight = 30;
  // important to start with only 1 visible channel --- if we want to default to more, do it in a useEffect after we figure out the number of channels in the dataset
  const [timeSeriesViewOpts, setTimeSeriesViewOpts] =
    useState<TimeSeriesViewOpts>({
      numVisibleChannels: 1,
      visibleStartChannel: 0,
      autoChannelSeparation: 0.5,
      colorChannels: true,
    });
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
        <TimeSeriesViewToolbar
          width={width}
          height={bottomToolBarHeight}
          objectPath={path}
          timeSeriesViewOpts={timeSeriesViewOpts}
          setTimeSeriesViewOpts={setTimeSeriesViewOpts}
        />
      </div>
    </div>
  );
};

export default NeurodataTimeSeriesItemView;
