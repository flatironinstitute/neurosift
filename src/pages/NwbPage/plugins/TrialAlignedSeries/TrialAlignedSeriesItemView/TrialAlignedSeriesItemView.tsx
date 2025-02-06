import { FunctionComponent } from "react";
import PSTHItemView from "../../PSTH/PSTHItemView/PSTHItemView";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
  additionalPaths?: string[];
  condensed?: boolean;
  initialStateString?: string;
  setStateString?: (x: string) => void;
  hidden?: boolean;
};

const TrialAlignedSeriesItemView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
  additionalPaths,
  initialStateString,
  setStateString,
  hidden,
}) => {
  return (
    <PSTHItemView
      width={width || 800}
      height={height || 800}
      nwbUrl={nwbUrl}
      path={path}
      additionalPaths={additionalPaths}
      initialStateString={initialStateString}
      setStateString={setStateString}
      mode={"time-aligned-series"}
      hidden={hidden}
    />
  );
};

export default TrialAlignedSeriesItemView;
