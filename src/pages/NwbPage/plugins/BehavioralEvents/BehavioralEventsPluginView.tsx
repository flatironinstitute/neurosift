import { FunctionComponent } from "react";
import BehavioralEventsItemView from "./BehavioralEventsItemView/BehavioralEventsItemView";
import { SetupTimeseriesSelection } from "../PSTH/PSTHItemView/context-timeseries-selection";

type Props = {
  nwbUrl: string;
  path: string;
  width?: number;
  height?: number;
};

const BehavioralEventsPluginView: FunctionComponent<Props> = ({
  nwbUrl,
  path,
  width = 500,
  height = 500,
}) => {
  return (
    <SetupTimeseriesSelection>
      <BehavioralEventsItemView
        width={width}
        height={height}
        nwbUrl={nwbUrl}
        path={path}
      />
    </SetupTimeseriesSelection>
  );
};

export default BehavioralEventsPluginView;
