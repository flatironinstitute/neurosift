import NeurodataTimeIntervalsItemView from "../viewPlugins/TimeIntervals/NeurodataTimeIntervalsItemView";
import { NwbFileContext } from "../misc/NwbFileContext";
import { FunctionComponent, useState } from "react";
import {
  useFullWidth,
  useNwbFileContextValue,
  NwbFigureProps,
} from "./NwbFigureCommon";
import { SetupTimeseriesSelection } from "../contexts/context-timeseries-selection";

const TimeIntervalsFigure: FunctionComponent<NwbFigureProps> = ({
  nwb_url,
  path,
}) => {
  const nwbFileContextValue = useNwbFileContextValue(nwb_url);
  const height = 400;
  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const width = useFullWidth(div);
  if (!nwbFileContextValue) {
    return <div>Loading NWB file...</div>;
  }
  return (
    <div
      ref={(elmt) => setDiv(elmt)}
      style={{ position: "relative", width: "100%", height }}
    >
      {nwbFileContextValue.nwbFile ? (
        <NwbFileContext.Provider value={nwbFileContextValue}>
          <SetupTimeseriesSelection>
            <NeurodataTimeIntervalsItemView
              width={width ? width - 10 : 400}
              height={height}
              path={path}
            />
          </SetupTimeseriesSelection>
        </NwbFileContext.Provider>
      ) : (
        <div>Loading NWB file...</div>
      )}
    </div>
  );
};

export default TimeIntervalsFigure;
