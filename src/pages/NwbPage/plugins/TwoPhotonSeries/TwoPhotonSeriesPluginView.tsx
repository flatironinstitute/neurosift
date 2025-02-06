import { FunctionComponent } from "react";
import TwoPhotonSeriesItemView from "./TwoPhotonSeriesItemView/TwoPhotonSeriesItemView";
import { SetupTimeseriesSelection } from "../PSTH/PSTHItemView/context-timeseries-selection";

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
    <SetupTimeseriesSelection>
      <TwoPhotonSeriesItemView
        width={width}
        height={height}
        nwbUrl={nwbUrl}
        path={path}
      />
    </SetupTimeseriesSelection>
  );
};

export default TwoPhotonSeriesPluginView;
