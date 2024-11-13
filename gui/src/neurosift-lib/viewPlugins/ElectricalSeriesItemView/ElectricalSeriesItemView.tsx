import { FunctionComponent, useMemo, useState } from "react";
import NeurodataTimeSeriesItemView from "../TimeSeries/NeurodataTimeSeriesItemView";
import TabWidget from "../../components/TabWidget";
import EphysSummaryItemView from "../Ephys/EphysSummaryItemView";
import { checkUrlIsLocal } from "../viewPlugins";
import { useNwbFile } from "../../misc/NwbFileContext";
import SpikeSortingView from "./SpikeSortingView/SpikeSortingView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const ElectricalSeriesItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  condensed,
}) => {
  const [currentTabId, setCurrentTabId] = useState<string>("traces");
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
        label: "Traces",
        id: "traces",
        closeable: false,
      },
    ];
    if (showDendroViews) {
      tabs.push({
        label: "Ephys Summary",
        id: "ephys-summary",
        closeable: false,
      });
      tabs.push({
        label: "Spike Sorting (WIP)",
        id: "spike-sorting",
        closeable: false,
      });
      // tabs.push({
      //   label: "Preprocessing (WIP)",
      //   id: "preprocessing",
      //   closeable: false,
      // });
    }
    return tabs;
  }, [showDendroViews]);
  return (
    <TabWidget
      width={width}
      height={height}
      tabs={tabs}
      currentTabId={currentTabId}
      setCurrentTabId={setCurrentTabId}
      onCloseTab={() => {}}
    >
      <NeurodataTimeSeriesItemView
        width={0}
        height={0}
        path={path}
        condensed={condensed}
      />
      {showDendroViews && (
        <EphysSummaryItemView
          width={0}
          height={0}
          path={path}
          condensed={false}
        />
      )}
      {showDendroViews && <SpikeSortingView width={0} height={0} path={path} />}
      {/* {showDendroViews && (
        <EphysPreprocessingView width={0} height={0} path={path} />
      )} */}
    </TabWidget>
  );
};

export default ElectricalSeriesItemView;
