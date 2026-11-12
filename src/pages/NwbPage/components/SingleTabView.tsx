import ScrollY from "@components/ScrollY";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2/ProvideTimeseriesSelection";
import React from "react";
import NwbObjectView from "../NwbObjectView";
import { NwbObjectViewPlugin } from "../plugins/pluginInterface";
import TabToolbar, { TOOLBAR_HEIGHT } from "../TabToolbar";
import { ObjectType } from "../Types";

interface SingleTabViewProps {
  nwbUrl: string;
  width: number;
  height: number;
  tabId: string;
  path: string;
  objectType: ObjectType;
  plugin?: NwbObjectViewPlugin;
  secondaryPaths?: string[];
  onOpenObjectInNewTab: (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => void;
}

const SingleTabView: React.FC<SingleTabViewProps> = ({
  nwbUrl,
  width,
  height,
  tabId,
  path,
  objectType,
  plugin,
  secondaryPaths,
  onOpenObjectInNewTab,
}) => {
  return (
    <ProvideTimeseriesSelection>
      <div>
        <TabToolbar width={width} tabId={tabId} nwbUrl={nwbUrl} path={path} />
        <ScrollY
          width={width}
          height={height - TOOLBAR_HEIGHT}
          top={TOOLBAR_HEIGHT}
        >
          <NwbObjectView
            nwbUrl={nwbUrl}
            path={path}
            objectType={objectType}
            onOpenObjectInNewTab={onOpenObjectInNewTab}
            plugin={plugin}
            secondaryPaths={secondaryPaths}
            width={width - 20}
            height={height - TOOLBAR_HEIGHT - 5}
          />
        </ScrollY>
      </div>
    </ProvideTimeseriesSelection>
  );
};

export default SingleTabView;
