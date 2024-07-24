import { RemoteH5FileX } from "@remote-h5-file/index";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { FunctionComponent, useEffect, useState } from "react";
import BrowseNwbView from "../BrowseNwbView/BrowseNwbView";
import NeurosiftAnnotationsView from "../NeurosiftAnnotationsView/NeurosiftAnnotationsView";
import DefaultNwbFileView from "./DefaultNwbFileView";
import SpecificationsView from "../SpecificationsView/SpecificationsView";
import WidgetsView from "../WidgetsView/WidgetsView";

type Props = {
  width: number;
  height: number;
  nwbFile: RemoteH5FileX;
};

type ViewMode =
  | "default"
  | "raw"
  | "specifications"
  | "widgets"
  | "dendro"
  | "annotations";

const NwbMainViewMainPanel: FunctionComponent<Props> = ({
  width,
  height,
  nwbFile,
}) => {
  const topBarHeight = 50;

  const [viewMode, setViewMode] = useState<ViewMode>("default");

  const [hasBeenVisibleViewModes, setHasBeenVisibleViewModes] = useState<
    ViewMode[]
  >([]);
  useEffect(() => {
    if (!hasBeenVisibleViewModes.includes(viewMode)) {
      setHasBeenVisibleViewModes([...hasBeenVisibleViewModes, viewMode]);
    }
  }, [viewMode, hasBeenVisibleViewModes]);

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
          visibility: viewMode === "default" ? undefined : "hidden",
        }}
      >
        {hasBeenVisibleViewModes.includes("default") && (
          <DefaultNwbFileView
            width={width}
            height={height - topBarHeight}
            nwbFile={nwbFile}
          />
        )}
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: height - topBarHeight,
          top: topBarHeight,
          visibility: viewMode === "raw" ? undefined : "hidden",
        }}
      >
        {hasBeenVisibleViewModes.includes("raw") && (
          <BrowseNwbView width={width} height={height - topBarHeight} />
        )}
      </div>
      {/* <div style={{ position: 'absolute', width, height: height - topBarHeight, top: topBarHeight, visibility: viewMode === 'dendro' ? undefined : 'hidden' }}>
                {hasBeenVisibleViewModes.includes('dendro') && (
                    <DendroView
                        width={width}
                        height={height - topBarHeight}
                    />
                )}
            </div> */}
      <div
        style={{
          position: "absolute",
          width,
          height: height - topBarHeight,
          top: topBarHeight,
          visibility: viewMode === "specifications" ? undefined : "hidden",
        }}
      >
        {hasBeenVisibleViewModes.includes("specifications") && (
          <SpecificationsView width={width} height={height - topBarHeight} />
        )}
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: height - topBarHeight,
          top: topBarHeight,
          visibility: viewMode === "widgets" ? undefined : "hidden",
        }}
      >
        {hasBeenVisibleViewModes.includes("widgets") && (
          <WidgetsView width={width} height={height - topBarHeight} />
        )}
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: height - topBarHeight,
          top: topBarHeight,
          visibility: viewMode === "annotations" ? undefined : "hidden",
        }}
      >
        {hasBeenVisibleViewModes.includes("annotations") && (
          <div>
            <NeurosiftAnnotationsView
              width={width}
              height={height - topBarHeight}
            />
          </div>
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
  // const {neurosiftAnnotationsAccessToken} = useNeurosiftAnnotations()
  return (
    <ToggleButtonGroup
      color="primary"
      value={viewMode}
      exclusive
      onChange={handleChange}
      aria-label="Platform"
    >
      <ToggleButton value="default">Default</ToggleButton>
      <ToggleButton value="raw">Raw</ToggleButton>
      {/* disable for now until we develop it more */}
      {/* <ToggleButton value="dendro">Dendro</ToggleButton> */}
      <ToggleButton value="widgets">Widgets</ToggleButton>
      <ToggleButton value="specifications">Specifications</ToggleButton>
      <ToggleButton value="annotations">Annotations</ToggleButton>
    </ToggleButtonGroup>
  );
};

export default NwbMainViewMainPanel;
