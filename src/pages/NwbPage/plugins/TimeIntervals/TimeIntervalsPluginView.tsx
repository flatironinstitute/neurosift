import { FunctionComponent } from "react";
import { SetupTimeseriesSelection } from "../PSTH/PSTHItemView/context-timeseries-selection";
import NwbTimeIntervalsView from "./TimeIntervalsViewItem/NwbTimeIntervalsView";

type Props = {
  width?: number;
  height?: number;
  path: string;
  nwbUrl: string;
};

const TimeIntervalsPluginView: FunctionComponent<Props> = ({
  width = 0,
  height = 0,
  path,
  nwbUrl,
}) => {
  return (
    <SetupTimeseriesSelection>
      <NwbTimeIntervalsView
        width={width}
        height={height}
        path={path}
        nwbUrl={nwbUrl}
      />
    </SetupTimeseriesSelection>
  );
};

export default TimeIntervalsPluginView;
