import { FunctionComponent } from "react";
import BehavioralEventsItemView from "./BehavioralEventsItemView/BehavioralEventsItemView";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";

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
    <ProvideTimeseriesSelection>
      <BehavioralEventsItemView
        width={width}
        height={height}
        nwbUrl={nwbUrl}
        path={path}
      />
    </ProvideTimeseriesSelection>
  );
};

export default BehavioralEventsPluginView;
