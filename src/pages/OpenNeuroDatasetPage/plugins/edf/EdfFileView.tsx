import { FunctionComponent } from "react";
import { OpenNeuroPluginProps } from "../pluginInterface";
import EdfViewer from "@shared/EdfViewer/EdfViewer";

const EdfFileView: FunctionComponent<OpenNeuroPluginProps> = ({
  file,
  width,
  height,
}) => {
  return (
    <EdfViewer
      edfUrl={file.urls[0]}
      width={width || 800}
      height={height || 800}
    />
  );
};

export default EdfFileView;
