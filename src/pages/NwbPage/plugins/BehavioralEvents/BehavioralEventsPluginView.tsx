import { FunctionComponent } from "react";
import BehavioralEventsItemView from "./BehavioralEventsItemView/BehavioralEventsItemView";

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
    <BehavioralEventsItemView
      width={width}
      height={height}
      nwbUrl={nwbUrl}
      path={path}
    />
  );
};

export default BehavioralEventsPluginView;
