import { RemoteH5FileX } from "@remote-h5-file/index";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { FunctionComponent, useEffect, useState } from "react";
import BrowseNwbView from "../BrowseNwbView/BrowseNwbView";
import NeurosiftAnnotationsView from "../NeurosiftAnnotationsView/NeurosiftAnnotationsView";
import DefaultNwbFileView from "./DefaultNwbFileView";
import SpecificationsView from "../SpecificationsView/SpecificationsView";
import WidgetsView from "../WidgetsView/WidgetsView";
import DendroView from "../DendroView/DendroView";
import InfoView from "./InfoView";

type Props = {
  width: number;
  height: number;
  nwbFile: RemoteH5FileX;
  neurodataItems: {
    path: string;
    neurodataType: string;
  }[];
};

type ViewMode =
  | "nwb"
  | "raw"
  | "specifications"
  | "widgets"
  | "dendro"
  | "annotations"
  | "info";

const NwbMainViewMainPanel: FunctionComponent<Props> = ({
  width,
  height,
  nwbFile,
  neurodataItems,
}) => {
  const topBarHeight = 50;

  const [viewMode, setViewMode] = useState<ViewMode>("nwb");

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
          visibility: viewMode === "nwb" ? undefined : "hidden",
        }}
      >
        {hasBeenVisibleViewModes.includes("nwb") && (
          <DefaultNwbFileView
            width={width}
            height={height - topBarHeight}
            nwbFile={nwbFile}
            neurodataItems={neurodataItems}
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
      <div
        style={{
          position: "absolute",
          width,
          height: height - topBarHeight,
          top: topBarHeight,
          visibility: viewMode === "dendro" ? undefined : "hidden",
        }}
      >
        {hasBeenVisibleViewModes.includes("dendro") && (
          <DendroView width={width} height={height - topBarHeight} />
        )}
      </div>
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
      <div
        style={{
          position: "absolute",
          width,
          height: height - topBarHeight,
          top: topBarHeight,
          visibility: viewMode === "info" ? undefined : "hidden",
        }}
      >
        {hasBeenVisibleViewModes.includes("info") && (
          <InfoView
            width={width}
            height={height - topBarHeight}
            nwbFile={nwbFile}
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
  // const {neurosiftAnnotationsAccessToken} = useNeurosiftAnnotations()
  return (
    <ToggleButtonGroup
      color="primary"
      value={viewMode}
      exclusive
      onChange={handleChange}
      aria-label="Platform"
    >
      <ToggleButton value="nwb" title="NWB file exploration">
        NWB
      </ToggleButton>
      <ToggleButton value="raw" title="HDF5 file exploration">
        Raw
      </ToggleButton>
      {/* disable for now until we develop it more */}
      {/* <ToggleButton value="dendro">Dendro</ToggleButton> */}
      <ToggleButton value="widgets" title="Views relevant for this file">
        Widgets
      </ToggleButton>
      <ToggleButton value="specifications" title="HDMF specifications">
        Specifications
      </ToggleButton>
      <ToggleButton value="dendro" title="Dendro">
        Dendro
      </ToggleButton>
      <ToggleButton value="annotations" title="Neurosift annotations">
        Annotations
      </ToggleButton>
      <ToggleButton value="info" title="Info about the file">
        Info
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default NwbMainViewMainPanel;
