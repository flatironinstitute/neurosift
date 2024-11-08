import Splitter from "neurosift-lib/components/Splitter";
import { FunctionComponent, useState } from "react";
import { useNwbFile } from "neurosift-lib/misc/NwbFileContext";
import { useGroup } from "../NwbMainView/NwbMainView";
import { ViewPlugin } from "../viewPlugins/viewPlugins";
import NeurodataItemViewLeftPanel from "./NeurodataItemViewLeftPanel";

type Props = {
  width: number;
  height: number;
  viewPlugin?: ViewPlugin;
  itemPath: string;
  additionalItemPaths?: string[];
  condensed?: boolean;
  tabName?: string;
  initialStateString?: string;
  hidden?: boolean;
};

const ViewItemWidget: FunctionComponent<Props> = ({
  width,
  height,
  viewPlugin,
  itemPath,
  additionalItemPaths,
  initialStateString,
  condensed,
  tabName,
  hidden,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");
  const group = useGroup(nwbFile, itemPath);

  const [stateString, setStateString] = useState<string | undefined>(undefined);

  const content = viewPlugin ? (
    <viewPlugin.component
      width={width}
      height={height}
      path={itemPath}
      additionalPaths={additionalItemPaths}
      condensed={condensed}
      hidden={hidden}
      initialStateString={viewPlugin.usesState ? initialStateString : undefined}
      setStateString={viewPlugin.usesState ? setStateString : undefined}
    />
  ) : (
    <div>
      <h3>View plugin not found</h3>
      <p>
        No view plugin found for this item. If you think there should be one,
        please report this as a bug.
      </p>
    </div>
  );

  if (condensed) return content;

  return (
    <Splitter
      direction="horizontal"
      initialPosition={300}
      width={width}
      height={height}
    >
      <NeurodataItemViewLeftPanel
        width={0}
        height={0}
        path={itemPath}
        additionalPaths={additionalItemPaths}
        group={group}
        viewName={viewPlugin?.name || ""}
        tabName={tabName}
        viewPlugin={viewPlugin}
        stateString={stateString}
      />
      {content}
    </Splitter>
  );
};

export default ViewItemWidget;
