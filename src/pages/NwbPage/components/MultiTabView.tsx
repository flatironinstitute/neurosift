import ScrollY from "@components/ScrollY";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2/ProvideTimeseriesSelection";
import React from "react";
import NwbObjectView from "../NwbObjectView";
import { NwbObjectViewPlugin } from "../plugins/pluginInterface";
import TabToolbar, { TOOLBAR_HEIGHT } from "../TabToolbar";
import { ObjectType } from "../Types";

interface MultiTabViewProps {
  nwbUrl: string;
  width: number;
  height: number;
  tabId: string;
  paths: string[];
  objectTypes: ObjectType[];
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
  onOpenObjectInNewTab,
}) => {
  return (
    <ProvideTimeseriesSelection>
      <div>
        <TabToolbar
          width={width - 20}
          tabId={tabId}
          nwbUrl={nwbUrl}
          paths={paths}
        />
        <ScrollY
          width={width - 20}
          height={height - TOOLBAR_HEIGHT}
          top={TOOLBAR_HEIGHT}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              padding: 0,
            }}
          >
            {paths.map((path, index) => (
              <div key={path}>
                {/* {index > 0 && <hr style={{ margin: "20px 0" }} />} */}
                <NwbObjectView
                  nwbUrl={nwbUrl}
                  path={path}
                  objectType={objectTypes[index]}
                  onOpenObjectInNewTab={onOpenObjectInNewTab}
                  width={width - 40} // leave space for the scrollbar
                  height={undefined}
                  inMultiView={true}
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
