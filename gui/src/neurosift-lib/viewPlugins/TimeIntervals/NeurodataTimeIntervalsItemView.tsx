import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { FunctionComponent, useEffect, useState } from "react";
import DynamicTableView from "../DynamicTable/DynamicTableView";
import NwbTimeIntervalsView from "./NwbTimeIntervalsView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

type ViewMode = "timeplot" | "table";

const NeurodataTimeIntervalsItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  const topBarHeight = 50;

  const [viewMode, setViewMode] = useState<ViewMode>("timeplot");

  const [visitedViewModes, setVisitedViewModes] = useState<ViewMode[]>([]);
  useEffect(() => {
    if (!visitedViewModes.includes(viewMode)) {
      setVisitedViewModes([...visitedViewModes, viewMode]);
    }
  }, [visitedViewModes, viewMode]);

  return (
    <div style={{ position: "absolute", width, height }}>
      <div
        style={{
          position: "absolute",
          width,
          height: topBarHeight,
          paddingLeft: 10,
        }}
      >
        <ViewModeToggleButton viewMode={viewMode} setViewMode={setViewMode} />
      </div>
      {/* Important to use undefined rather than visible so that the hidden value is respected for parent components */}
      <div
        style={{
          position: "absolute",
          width,
          height: height - topBarHeight,
          top: topBarHeight,
          visibility: viewMode === "timeplot" ? undefined : "hidden",
        }}
      >
        {visitedViewModes.includes("timeplot") && (
          <NwbTimeIntervalsView
            width={width}
            height={height - topBarHeight}
            path={path}
          />
        )}
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: height - topBarHeight,
          top: topBarHeight,
          visibility: viewMode === "table" ? undefined : "hidden",
        }}
      >
        {visitedViewModes.includes("table") && (
          <DynamicTableView
            width={width}
            height={height - topBarHeight}
            path={path}
          />
        )}
      </div>
    </div>
  );
};

type ViewModeToggleButtonProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

const ViewModeToggleButton: FunctionComponent<ViewModeToggleButtonProps> = ({
  viewMode,
  setViewMode,
}) => {
  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: string,
  ) => {
    if (!newViewMode) return;
    setViewMode(newViewMode as ViewMode);
  };
  return (
    <ToggleButtonGroup
      color="primary"
      value={viewMode}
      exclusive
      onChange={handleChange}
      aria-label="Platform"
    >
      <ToggleButton value="timeplot">Time plot</ToggleButton>
      <ToggleButton value="table">Table</ToggleButton>
    </ToggleButtonGroup>
  );
};

export default NeurodataTimeIntervalsItemView;
