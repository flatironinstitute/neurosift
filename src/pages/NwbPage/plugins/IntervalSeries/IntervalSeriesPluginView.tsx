import { FunctionComponent } from "react";
import NwbIntervalSeriesView from "./IntervalSeriesViewItem/NwbIntervalSeriesView";

type Props = {
  width?: number;
  height?: number;
  path: string;
  nwbUrl: string;
};

const IntervalSeriesPluginView: FunctionComponent<Props> = ({
  width = 0,
  height = 0,
  path,
  nwbUrl,
}) => {
  return (
    <NwbIntervalSeriesView
      width={width}
      height={height}
      path={path}
      nwbUrl={nwbUrl}
    />
  );
};

export default IntervalSeriesPluginView;
