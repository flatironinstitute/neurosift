import { FunctionComponent } from "react";
import { DatasetPluginProps } from "../pluginInterface";
import EdfViewer from "@shared/EdfViewer/EdfViewer";
import useResolvedDatasetFileUrl from "../useResolvedDatasetFileUrl";

const EdfFileView: FunctionComponent<DatasetPluginProps> = ({
  file,
  width,
  height,
}) => {
  // The EDF reader issues its own range requests, which cannot carry the
  // DANDI auth header, so hand it the resolved url.
  const edfUrl = useResolvedDatasetFileUrl(file.urls[0]);
  if (!edfUrl) return <div>Loading...</div>;
  return (
    <EdfViewer edfUrl={edfUrl} width={width || 800} height={height || 800} />
  );
};

export default EdfFileView;
