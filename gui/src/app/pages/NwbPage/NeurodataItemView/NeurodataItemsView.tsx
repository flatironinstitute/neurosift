import { RemoteH5FileX } from "@remote-h5-file/index";
import Splitter from "neurosift-lib/components/Splitter";
import { FunctionComponent, useMemo } from "react";
import { useNeurodataItems, useNwbFile } from "../NwbFileContext";
import TimeseriesSelectionWidget from "../viewPlugins/TimeSeries/TimeseriesItemView/TimeseriesSelectionWidget";
import {
  findViewPluginsForType,
  getViewPlugins,
} from "../viewPlugins/viewPlugins";
import ShareTabComponent from "./ShareTabComponent";
import {
  NwbFileSpecifications,
  useNwbFileSpecifications,
} from "../SpecificationsView/SetupNwbFileSpecificationsProvider";

type Props = {
  width: number;
  height: number;
  items: string[];
  tabName?: string;
  hidden?: boolean;
};

const NeurodataItemsView: FunctionComponent<Props> = ({
  width,
  height,
  items,
  tabName,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const itemNames = useMemo(() => {
    return items.map((item) => getNameForItemView(item));
  }, [items]);

  return (
    <Splitter
      direction="horizontal"
      initialPosition={300}
      width={width}
      height={height}
    >
      <LeftPanel width={0} height={0} itemNames={itemNames} tabName={tabName} />
      <MainPanel width={0} height={0} items={items} />
    </Splitter>
  );
};

const getNameForItemView = (item: string) => {
  if (item.startsWith("neurodata-item:")) {
    const itemPath = item.slice(`neurodata-item:`.length).split("|")[0];
    const neurodataType = item.slice(`neurodata-item:`.length).split("|")[1];
    return `${itemPath} (${neurodataType})`;
  } else if (item.startsWith("view:")) {
    const pName = item.slice(`view:`.length).split("|")[0];
    const itemPath = item.slice(`view:`.length).split("|")[1];
    return `${itemPath} (${pName})`;
  } else return item;
};

type LeftPanelProps = {
  width: number;
  height: number;
  itemNames: string[];
  tabName?: string;
};

const LeftPanel: FunctionComponent<LeftPanelProps> = ({
  width,
  height,
  itemNames,
  tabName,
}) => {
  return (
    <div>
      <TimeseriesSelectionWidget />
      <hr />
      <ShareTabComponent tabName={tabName} />
    </div>
  );
};

type MainPanelProps = {
  width: number;
  height: number;
  items: string[];
};

const MainPanel: FunctionComponent<MainPanelProps> = ({
  width,
  height,
  items,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");
  const neurodataItems = useNeurodataItems();
  const specifications = useNwbFileSpecifications();
  const H = height / items.length;
  const positions = items.map((_, i) => i * H);
  const titleBarHeight = 25;
  // a nice attractive title bar color
  const titleBarColor = "#68e";
  if (!specifications) return <div>Loading specifications...</div>;
  return (
    <div style={{ position: "absolute", width, height }}>
      {items.map((item, i) => {
        const { viewPlugin, itemPath, additionalItemPaths } =
          getViewPluginAndItemPath(
            item,
            nwbFile,
            neurodataItems,
            specifications,
          );
        if (!viewPlugin) return <div key="">View plugin not found: {item}</div>;
        return (
          <div
            key={item}
            style={{
              position: "absolute",
              width,
              height: H,
              top: positions[i],
            }}
          >
            <div
              style={{
                position: "absolute",
                width,
                height: titleBarHeight - 5,
                backgroundColor: titleBarColor,
                color: "white",
                fontSize: 12,
                paddingLeft: 10,
                paddingTop: 5,
              }}
            >
              {getNameForItemView(item)}
            </div>
            <div
              style={{
                position: "absolute",
                width,
                height: H - titleBarHeight,
                top: titleBarHeight,
              }}
            >
              {
                <viewPlugin.component
                  width={width}
                  height={H - titleBarHeight}
                  path={itemPath}
                  additionalPaths={additionalItemPaths}
                  condensed={true}
                />
              }
            </div>
          </div>
        );
      })}
    </div>
  );
};

const getViewPluginAndItemPath = (
  item: string,
  nwbFile: RemoteH5FileX,
  neurodataItems: {
    path: string;
    neurodataType: string;
  }[],
  specifications: NwbFileSpecifications,
) => {
  const viewPlugins = getViewPlugins({ nwbUrl: nwbFile.getUrls()[0] || "" });
  if (item.startsWith("neurodata-item:")) {
    const itemPath = item.slice(`neurodata-item:`.length).split("|")[0];
    const neurodataType = item.slice(`neurodata-item:`.length).split("|")[1];
    const { defaultViewPlugin } = findViewPluginsForType(
      neurodataType,
      { nwbFile, neurodataItems },
      specifications,
    );
    return {
      viewPlugin: defaultViewPlugin,
      itemPath,
      additionalItemPaths: undefined,
    };
  } else if (item.startsWith("view:")) {
    const pName = item.slice(`view:`.length).split("|")[0];
    let itemPath = item.slice(`view:`.length).split("|")[1];
    let additionalItemPaths: string[] | undefined = undefined;
    if (itemPath.includes("^")) {
      additionalItemPaths = itemPath.split("^").slice(1);
      itemPath = itemPath.split("^")[0];
    }
    const viewPlugin = viewPlugins.find((p) => p.name === pName);
    return { viewPlugin, itemPath, additionalItemPaths };
  } else
    return {
      viewPlugin: undefined,
      itemPath: undefined,
      additionalItemPaths: undefined,
    };
};

export default NeurodataItemsView;
