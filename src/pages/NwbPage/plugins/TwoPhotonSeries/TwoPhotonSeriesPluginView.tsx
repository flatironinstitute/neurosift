import { FunctionComponent } from "react";
import TwoPhotonSeriesItemView from "./TwoPhotonSeriesItemView/TwoPhotonSeriesItemView";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";

type Props = {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
  width?: number;
  height?: number;
};

const TwoPhotonSeriesPluginView: FunctionComponent<Props> = ({
  nwbUrl,
  path,
  width = 500,
  height = 500,
}) => {
  return (
    <ProvideTimeseriesSelection>
      <TwoPhotonSeriesItemView
        width={width}
        height={height}
        nwbUrl={nwbUrl}
        path={path}
      />
    </ProvideTimeseriesSelection>
  );
};

export default TwoPhotonSeriesPluginView;
