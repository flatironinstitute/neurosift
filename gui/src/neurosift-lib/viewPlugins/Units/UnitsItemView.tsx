import { FunctionComponent, useMemo, useState } from "react";
import DynamicTableView from "../DynamicTable/DynamicTableView";
import { useSelectedUnitIds } from "../../contexts/context-unit-selection";
import { useNwbFile } from "../../misc/NwbFileContext";
import { checkUrlIsLocal } from "../viewPlugins";
import TabWidget from "../../components/TabWidget";
import UnitsSummaryItemView from "./UnitsSummaryItemView";
import UnitsCEBRAView from "./UnitsCEBRAView/UnitsCEBRAView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const UnitsItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  condensed,
}) => {
  const [currentTabId, setCurrentTabId] = useState<string>("table");
  const nwbFile = useNwbFile();
  const showDendroViews = useMemo(() => {
    return (
      nwbFile &&
      !checkUrlIsLocal({ nwbUrl: nwbFile.getUrls()[0] }) &&
      !condensed
    );
  }, [nwbFile, condensed]);
  const tabs = useMemo(() => {
    const tabs = [
      {
        label: "Table",
        id: "table",
        closeable: false,
      },
    ];
    if (showDendroViews) {
      tabs.push({
        label: "Units Summary",
        id: "units-summary",
        closeable: false,
      });
      tabs.push({
        label: "CEBRA",
        id: "cebra",
        closeable: false,
      });
    }
    return tabs;
  }, [showDendroViews]);
  const { selectedUnitIds, unitIdSelectionDispatch } = useSelectedUnitIds();
  const selectedUnitIdsList = useMemo(() => {
    return [...selectedUnitIds];
  }, [selectedUnitIds]);
  return (
    <TabWidget
      width={width}
      height={height}
      tabs={tabs}
      currentTabId={currentTabId}
      setCurrentTabId={setCurrentTabId}
      onCloseTab={() => {}}
    >
      <DynamicTableView
        width={width}
        height={height}
        path={path}
        referenceColumnName={"id"}
        selectedRowIds={selectedUnitIdsList}
        setSelectedRowIds={(ids) => {
          unitIdSelectionDispatch({
            type: "SET_SELECTION",
            incomingSelectedUnitIds: ids,
          });
        }}
      />
      {showDendroViews && (
        <UnitsSummaryItemView width={0} height={0} path={path} />
      )}
      {showDendroViews && <UnitsCEBRAView width={0} height={0} path={path} />}
    </TabWidget>
  );
};

export default UnitsItemView;
