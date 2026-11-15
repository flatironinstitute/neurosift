import ViewError from "@components/ViewError/ViewError";
import { LoadingState } from "@ui";
import { FunctionComponent } from "react";
import { DatasetPluginProps } from "../pluginInterface";
import useDatasetFileText from "../useDatasetFileText";
import TextPreview from "./TextPreview";

const TextFileView: FunctionComponent<DatasetPluginProps> = ({ file }) => {
  const { text, error } = useDatasetFileText(file.urls[0]);
  if (error) return <ViewError what="this file" error={error} />;
  if (text === undefined)
    return <LoadingState label="Loading the text" phase="loading" />;
  return <TextPreview text={text} />;
};

export default TextFileView;
