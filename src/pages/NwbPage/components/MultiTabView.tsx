import ScrollY from "@components/ScrollY";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2/ProvideTimeseriesSelection";
import React from "react";
import NwbObjectView from "../NwbObjectView";
import { NwbObjectViewPlugin } from "../plugins/pluginInterface";
import TabToolbar, { TOOLBAR_HEIGHT } from "../TabToolbar";
import ObjectHeaderBar from "./ObjectHeaderBar";
import { ObjectType } from "../Types";

interface MultiTabViewProps {
  nwbUrl: string;
  width: number;
  height: number;
  tabId: string;
  paths: string[];
  objectTypes: ObjectType[];
  plugins: (NwbObjectViewPlugin | undefined)[];
  secondaryPathsList: (string[] | undefined)[];
  onOpenObjectInNewTab: (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => void;
}

const MultiTabView: React.FC<MultiTabViewProps> = ({
  nwbUrl,
  width,
  height,
  tabId,
  paths,
  objectTypes,
  plugins,
  secondaryPathsList,
  onOpenObjectInNewTab,
}) => {
  return (
    <ProvideTimeseriesSelection>
      <div>
        <TabToolbar width={width - 20} tabId={tabId} nwbUrl={nwbUrl} />
        <ScrollY
          width={width - 20}
          height={height - TOOLBAR_HEIGHT}
          top={TOOLBAR_HEIGHT}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 0,
            }}
          >
            {paths.map((path, index) => (
              <div
                key={plugins[index] ? plugins[index].name + ":" + path : path}
                style={{ marginBottom: 20 }}
              >
                <ObjectHeaderBar width={width - 40} path={path} />
                <NwbObjectView
                  nwbUrl={nwbUrl}
                  path={path}
                  objectType={objectTypes[index]}
                  onOpenObjectInNewTab={onOpenObjectInNewTab}
                  width={width - 40} // leave space for the scrollbar
                  height={undefined}
                  inMultiView={true}
                  plugin={plugins[index]}
                  secondaryPaths={secondaryPathsList[index]}
                />
              </div>
            ))}
          </div>
        </ScrollY>
      </div>
    </ProvideTimeseriesSelection>
  );
};

export default MultiTabView;
