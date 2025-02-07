import { FunctionComponent } from "react";
import WindowRangeComponent from "./WindowRange";
import GroupBySelectionComponent from "./GroupBySelection";
import SortUnitsBySelectionComponent from "./SortUnitsBy";
import { PSTHTrialAlignedSeriesMode } from "../types";

type Props = {
  width: number;
  height: number;
  leftOffset: number;
  windowRangeStr: { start: string; end: string };
  setWindowRangeStr: (x: { start: string; end: string }) => void;
  groupByVariable: string;
  setGroupByVariable: (x: string) => void;
  setGroupByVariableCategories: (x: string[] | undefined) => void;
  nwbUrl: string;
  path: string;
  groupByVariableCategories: string[] | undefined;
  sortUnitsByVariable: [string, "asc" | "desc"] | undefined;
  setSortUnitsByVariable: (x: [string, "asc" | "desc"] | undefined) => void;
  unitsPath: string;
  mode: PSTHTrialAlignedSeriesMode;
};

const PSTHBottomControls: FunctionComponent<Props> = ({
  width,
  height,
  leftOffset,
  windowRangeStr,
  setWindowRangeStr,
  groupByVariable,
  setGroupByVariable,
  setGroupByVariableCategories,
  nwbUrl,
  path,
  groupByVariableCategories,
  sortUnitsByVariable,
  setSortUnitsByVariable,
  unitsPath,
  mode,
}) => {
  const sep = <>&nbsp;&bull;&nbsp;</>;

  return (
    <div
      style={{
        position: "absolute",
        left: leftOffset,
        width: width - leftOffset,
        height,
      }}
    >
      <WindowRangeComponent
        windowRangeStr={windowRangeStr}
        setWindowRangeStr={setWindowRangeStr}
      />
      {sep}
      <GroupBySelectionComponent
        groupByVariable={groupByVariable}
        setGroupByVariable={(v) => {
          setGroupByVariable(v);
          setGroupByVariableCategories(undefined);
        }}
        nwbUrl={nwbUrl}
        path={path}
        groupByVariableCategories={groupByVariableCategories}
        setGroupByVariableCategories={setGroupByVariableCategories}
      />
      {sep}
      {mode === "psth" && (
        <SortUnitsBySelectionComponent
          sortUnitsByVariable={sortUnitsByVariable}
          setSortUnitsByVariable={setSortUnitsByVariable}
          nwbUrl={nwbUrl}
          unitsPath={unitsPath}
        />
      )}
    </div>
  );
};

export default PSTHBottomControls;
