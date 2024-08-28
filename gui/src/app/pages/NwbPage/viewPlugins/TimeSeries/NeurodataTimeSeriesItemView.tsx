import { FunctionComponent, useMemo, useState } from "react";
import NwbTimeseriesView from "./TimeseriesItemView/NwbTimeseriesView";
import TimeSeriesViewToolbar, {
  TimeSeriesViewOpts,
} from "./TimeSeriesViewToolbar";
import { SpikeTrainsClient } from "../Units/DirectRasterPlotUnitsItemView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;

  spikeTrainsClient?: SpikeTrainsClient;
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
