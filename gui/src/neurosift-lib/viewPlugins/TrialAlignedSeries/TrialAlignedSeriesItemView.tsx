/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent } from "react";
import PSTHItemView from "../PSTH/PSTHItemView";

type Props = {
  width: number;
  height: number;
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
  path,
  additionalPaths,
  initialStateString,
  setStateString,
  hidden,
}) => {
  return (
    <PSTHItemView
      width={width}
      height={height}
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
