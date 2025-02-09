import { FunctionComponent } from "react";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
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
    <NwbTimeIntervalsView
      width={width}
      height={height}
      path={path}
      nwbUrl={nwbUrl}
    />
  );
};

export default TimeIntervalsPluginView;
