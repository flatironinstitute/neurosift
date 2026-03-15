import ScrollY from "@components/ScrollY";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2/ProvideTimeseriesSelection";
import React from "react";
import NwbObjectView from "../NwbObjectView";
import { NwbObjectViewPlugin } from "../plugins/pluginInterface";
import ObjectHeaderBar from "./ObjectHeaderBar";
import { ObjectType } from "../TabTypes";

interface MultiTabViewProps {
  nwbUrl: string;
  width: number;
  height: number;
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
  paths,
  objectTypes,
  plugins,
  secondaryPathsList,
  onOpenObjectInNewTab,
}) => {
  return (
    <ProvideTimeseriesSelection>
      <ScrollY width={width} height={height}>
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
              style={{ marginBottom: 8 }}
            >
              <ObjectHeaderBar width={width - 20} path={path} />
              <NwbObjectView
                nwbUrl={nwbUrl}
                path={path}
                objectType={objectTypes[index]}
                onOpenObjectInNewTab={onOpenObjectInNewTab}
                width={width - 20}
                height={undefined}
                inMultiView={true}
                plugin={plugins[index]}
                secondaryPaths={secondaryPathsList[index]}
              />
            </div>
          ))}
        </div>
      </ScrollY>
    </ProvideTimeseriesSelection>
  );
};

export default MultiTabView;
