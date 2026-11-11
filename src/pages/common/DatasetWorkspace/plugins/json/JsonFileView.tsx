import ViewError from "@components/ViewError/ViewError";
import { LoadingState } from "@ui";
import { FunctionComponent, useMemo } from "react";
import { DatasetPluginProps } from "../pluginInterface";
import TextPreview from "../text/TextPreview";
import useDatasetFileText from "../useDatasetFileText";

const JsonFileView: FunctionComponent<DatasetPluginProps> = ({ file }) => {
  const { text, error } = useDatasetFileText(file.urls[0]);
  const parsed = useMemo(() => {
    if (text === undefined) return undefined;
    try {
      return { json: JSON.stringify(JSON.parse(text), null, 2) };
    } catch (err) {
      return { error: err };
    }
  }, [text]);
  if (error || parsed?.error)
    return <ViewError what="this file" error={error ?? parsed?.error} />;
  if (parsed?.json === undefined)
    return <LoadingState label="Loading the JSON" phase="loading" />;
  return <TextPreview text={parsed.json} />;
};

export default JsonFileView;
