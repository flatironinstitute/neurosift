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
};

const TrialAlignedSeriesItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  additionalPaths,
  initialStateString,
  setStateString,
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
    />
  );
};

export default TrialAlignedSeriesItemView;
