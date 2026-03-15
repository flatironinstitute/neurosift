import ScrollY from "@components/ScrollY";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2/ProvideTimeseriesSelection";
import React from "react";
import NwbObjectView from "../NwbObjectView";
import { NwbObjectViewPlugin } from "../plugins/pluginInterface";
import { ObjectType } from "../TabTypes";

interface SingleTabViewProps {
  nwbUrl: string;
  width: number;
  height: number;
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
  path,
  objectType,
  plugin,
  secondaryPaths,
  onOpenObjectInNewTab,
}) => {
  return (
    <ProvideTimeseriesSelection>
      <ScrollY width={width} height={height}>
        <NwbObjectView
          nwbUrl={nwbUrl}
          path={path}
          objectType={objectType}
          onOpenObjectInNewTab={onOpenObjectInNewTab}
          plugin={plugin}
          secondaryPaths={secondaryPaths}
          width={width - 20}
          height={height - 5}
        />
      </ScrollY>
    </ProvideTimeseriesSelection>
  );
};

export default SingleTabView;
