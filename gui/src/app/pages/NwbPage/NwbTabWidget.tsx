/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FunctionComponent, useMemo, useReducer } from "react";
import TabWidget from "neurosift-lib/components/TabWidget";
import { SetupTimeseriesSelection } from "../../package/context-timeseries-selection";
import {
  UnitSelectionContext,
  defaultUnitSelection,
  unitSelectionReducer,
} from "../../package/context-unit-selection";
import NeurodataItemsView from "./NeurodataItemView/NeurodataItemsView";
import ViewItemWidget from "./NeurodataItemView/ViewItemWidget";
import { useNeurodataItems, useNwbFile } from "neurosift-lib/misc/NwbFileContext";
import NwbMainView from "./NwbMainView/NwbMainView";
import { useNwbOpenTabs } from "./NwbOpenTabsContext";
import TimeseriesAlignmentView from "./TimeseriesAlignmentView/TimeseriesAlignmentView";
import {
  getViewPlugins,
  findViewPluginsForType,
} from "./viewPlugins/viewPlugins";
import { useNwbFileSpecifications } from "neurosift-lib/misc/SpecificationsView/SetupNwbFileSpecificationsProvider";

const NwbTabWidget: FunctionComponent<{
  width: number;
  height: number;
  usingLindi: boolean;
}> = ({ width, height, usingLindi }) => {
  const {
    openTabs,
    currentTabName,
    setCurrentTab,
    closeTab,
    initialTimeSelections,
    initialStateStrings,
  } = useNwbOpenTabs();
  return (
    <TabWidget
      width={width}
      height={height}
      tabs={openTabs.map(({ tabName }) => ({
        id: tabName,
        label: labelFromTabName(tabName),
        title: titleFromTabName(tabName),
        closeable: tabName === "main" ? false : true,
        icon: iconFromTabName(tabName),
      }))}
      currentTabId={currentTabName}
      setCurrentTabId={setCurrentTab}
      onCloseTab={(fileName) => closeTab(fileName)}
    >
      {openTabs.map(({ tabName }) => (
        <TabChild
          key={tabName}
          tabName={tabName}
          usingLindi={usingLindi}
          initialTimeSelection={initialTimeSelections[tabName]}
          initialStateString={(initialStateStrings || {})[tabName]}
          width={0}
          height={0}
          hidden={tabName !== currentTabName}
        />
      ))}
    </TabWidget>
  );
};

type TabChildProps = {
  tabName: string;
  width: number;
  height: number;
  initialTimeSelection?: { t1?: number; t2?: number; t0?: number };
  initialStateString?: string;
  condensed?: boolean;
  usingLindi: boolean;
  hidden?: boolean;
};

const TabChild: FunctionComponent<TabChildProps> = ({
  tabName,
  width,
  height,
  condensed,
  initialTimeSelection,
  initialStateString,
  usingLindi,
  hidden,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is undefined");
  const neurodataItems = useNeurodataItems();
  const viewPlugins = useMemo(
    () => getViewPlugins({ nwbUrl: nwbFile.getUrls()[0] || "" }),
    [nwbFile],
  );
  const specifications = useNwbFileSpecifications();
  const [unitSelection, unitSelectionDispatch] = useReducer(
    unitSelectionReducer,
    defaultUnitSelection,
  );
  const { viewPlugin, itemPath, additionalItemPaths } = useMemo(() => {
    if (tabName.startsWith("view:")) {
      const pName = tabName.slice(`view:`.length).split("|")[0];
      let itemPath = tabName.slice(`view:`.length).split("|")[1];
      let additionalItemPaths: string[] | undefined = undefined;
      if (itemPath.includes("^")) {
        const aa = itemPath;
        itemPath = aa.split("^")[0];
        additionalItemPaths = aa.split("^").slice(1);
      }
      const viewPlugin = viewPlugins.find((p) => p.name === pName);
      return { viewPlugin, itemPath, additionalItemPaths };
    } else if (tabName.startsWith("neurodata-item:")) {
      const itemPath = tabName.slice(`neurodata-item:`.length).split("|")[0];
      const neurodataType = tabName
        .slice(`neurodata-item:`.length)
        .split("|")[1];
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
    } else
      return {
        viewPlugin: undefined,
        itemPath: undefined,
        additionalItemPaths: undefined,
      };
  }, [tabName, nwbFile, specifications, viewPlugins, neurodataItems]);
  if (!viewPlugin && !specifications && tabName.startsWith("neurodata-item:")) {
    // if the specifications are not loaded yet, we will still give it a chance to find an appropriate view plugin
    return <div>Loading NWB file specifications...</div>;
  }
  return (
    <SetupTimeseriesSelection initialTimeSelection={initialTimeSelection}>
      <UnitSelectionContext.Provider
        value={{ unitSelection, unitSelectionDispatch }}
      >
        {tabName === "main" ? (
          <NwbMainView
            key={tabName}
            width={width}
            height={height}
            usingLindi={usingLindi}
            hidden={hidden}
          />
        ) : tabName.startsWith("neurodata-item:") ||
          tabName.startsWith("view:") ? (
          <ViewItemWidget
            key={tabName}
            width={width}
            height={height}
            viewPlugin={viewPlugin}
            itemPath={itemPath || ""}
            additionalItemPaths={additionalItemPaths}
            condensed={condensed}
            tabName={tabName}
            initialStateString={initialStateString}
            hidden={hidden}
          />
        ) : tabName.startsWith("neurodata-items:") ? (
          (() => {
            const items = tabName.slice(`neurodata-items:`.length).split("@");
            return (
              <NeurodataItemsView
                key={tabName}
                width={width}
                height={height}
                items={items}
                tabName={tabName}
                hidden={hidden}
              />
            );
          })()
        ) : tabName === "timeseries-alignment" ? (
          <TimeseriesAlignmentView
            key={tabName}
            width={width}
            height={height}
            hidden={hidden}
          />
        ) : (
          <div key={tabName}>Not implemented</div>
        )}
      </UnitSelectionContext.Provider>
    </SetupTimeseriesSelection>
  );
};

const labelFromTabName = (tabName: string) => {
  if (tabName === "main") {
    return "main";
  } else if (tabName.startsWith("neurodata-item:")) {
    return `${tabName.slice(`neurodata-item:`.length).split("|")[0].split("/").slice(-1)[0]}`;
  } else if (tabName.startsWith("neurodata-items:")) {
    return `${tabName.slice(`neurodata-items:`.length).split("@").length} items`;
  } else if (tabName.startsWith("view:")) {
    return tabName.slice(`view:`.length);
  } else if (tabName === "timeseries-alignment") {
    return "timeseries alignment";
  } else if (tabName.startsWith("ns:")) {
    return `${tabName.slice(`ns:`.length).split("/").slice(-1)[0]}`;
  }
  return tabName;
};

const titleFromTabName = (tabName: string) => {
  if (tabName === "main") {
    return "main view";
  }
  return tabName;
};

const iconFromTabName = (tabName: string) => {
  return undefined;
};

export default NwbTabWidget;
