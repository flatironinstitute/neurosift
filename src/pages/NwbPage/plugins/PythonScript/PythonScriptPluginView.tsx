import LoadInPythonWindow from "./LoadInPythonComponent";

type Props = {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
};

const PythonScriptPluginView: React.FC<Props> = ({
  nwbUrl,
  path,
  objectType,
}) =>
  objectType === "group" ? (
    <LoadInPythonWindow nwbUrl={nwbUrl} path={path} />
  ) : null;

export default PythonScriptPluginView;
