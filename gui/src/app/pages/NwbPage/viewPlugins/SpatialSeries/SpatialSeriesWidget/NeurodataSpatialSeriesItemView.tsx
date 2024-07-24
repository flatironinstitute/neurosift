import { FunctionComponent } from "react";
import NwbTimeseriesView from "../../../viewPlugins/TimeSeries/TimeseriesItemView/NwbTimeseriesView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const NeurodataSpatialSeriesItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  // in the future, do something specific to the spatial series, like providing an X/Y legend
  return (
    <NwbTimeseriesView
      width={width}
      height={height}
      objectPath={path}
      colorChannels={true}
    />
  );
};

export default NeurodataSpatialSeriesItemView;
