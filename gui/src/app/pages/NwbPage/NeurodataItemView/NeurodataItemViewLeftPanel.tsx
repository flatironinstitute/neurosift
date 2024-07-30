import { FunctionComponent, PropsWithChildren } from "react";
import TimeseriesSelectionWidget from "../viewPlugins/TimeSeries/TimeseriesItemView/TimeseriesSelectionWidget";
import { RemoteH5Group } from "@remote-h5-file/index";
import ShareTabComponent from "./ShareTabComponent";
import { ViewPlugin } from "../viewPlugins/viewPlugins";
import LoadInPythonComponent from "./LoadInPythonComponent";
import ViewObjectNotesIconThing from "../ObjectNote/ViewObjectNotesIconThing";

type Props = {
  width: number;
  height: number;
  path: string;
  additionalPaths?: string[];
  group: RemoteH5Group | undefined;
  viewName: string;
  tabName?: string;
  viewPlugin: ViewPlugin;
  stateString?: string;
};

const NeurodataItemViewLeftPanel: FunctionComponent<Props> = ({
  width,
  path,
  group,
  viewName,
  tabName,
  viewPlugin,
  stateString,
}) => {
  const customContent = viewPlugin.leftPanelComponent ? (
    <viewPlugin.leftPanelComponent width={width} path={path} />
  ) : null;
  return (
    <div>
      <table className="nwb-table">
        <tbody>
          <tr>
            <td>Item path</td>
            <td>{path}</td>
          </tr>
          <tr>
            <td>Neurodata type</td>
            <td>{group?.attrs?.neurodata_type}</td>
          </tr>
          <tr>
            <td>Description</td>
            <td>{group?.attrs?.description}</td>
          </tr>
          <tr>
            <td>Comments</td>
            <td>
              <Abbreviate>{group?.attrs?.comments}</Abbreviate>
            </td>
          </tr>
          <tr>
            <td>View</td>
            <td>{viewName}</td>
          </tr>
        </tbody>
      </table>
      {viewPlugin.isTimeView && <TimeseriesSelectionWidget />}
      {customContent ? (
        <>
          <hr />
          {customContent}
        </>
      ) : null}
      <hr />
      <ShareTabComponent tabName={tabName} stateString={stateString} />
      <hr />
      {group && (
        <LoadInPythonComponent path={path} group={group} viewName={viewName} />
      )}
      <hr />
      <ViewObjectNotesIconThing objectPath={path} previewText={true} />
    </div>
  );
};

export const Abbreviate: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
  return <span>{abbreviateText(children as string)}</span>;
};

const abbreviateText = (text: string | undefined) => {
  if (text === undefined) return "";
  const maxLen = 300;
  if (text.length <= maxLen) return text;
  const abbrev = text.slice(0, maxLen) + "...";
  return abbrev;
};

export default NeurodataItemViewLeftPanel;
