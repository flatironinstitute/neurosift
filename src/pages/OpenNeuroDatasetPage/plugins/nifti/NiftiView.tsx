import { FunctionComponent } from "react";
import { Box } from "@mui/material";
import { DatasetPluginProps } from "../pluginInterface";
import NiftiViewer from "./components/NiftiViewer";

const NiftiView: FunctionComponent<DatasetPluginProps> = ({
  file,
  width,
  height,
}) => {
  // Use the first available URL
  const fileUrl = file.urls[0];

  return (
    <Box sx={{ width: "100%", height: "100%", overflow: "auto" }}>
      <NiftiViewer fileUrl={fileUrl} width={width} height={height} />
    </Box>
  );
};

export default NiftiView;
