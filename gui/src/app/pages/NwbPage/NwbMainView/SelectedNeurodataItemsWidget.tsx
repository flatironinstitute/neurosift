import { FunctionComponent, useCallback, useMemo } from "react";
import { FaEye } from "react-icons/fa";
import { useNwbOpenTabs } from "../NwbOpenTabsContext";
import { useSelectedItemViews } from "../SelectedItemViewsContext";
import { Hyperlink } from "@fi-sci/misc";

type Props = {
  // none
};

const SelectedNeurodataItemsWidget: FunctionComponent<Props> = () => {
  const { selectedItemViews } = useSelectedItemViews();
  const { openTab } = useNwbOpenTabs();
  const cc = (
    <span>
      View {selectedItemViews.length}{" "}
      {selectedItemViews.length === 1 ? "item" : "items"}
    </span>
  );
  const handleOpenView = useCallback(() => {
    if (selectedItemViews.length === 1) {
      openTab(selectedItemViews[0]);
    } else if (selectedItemViews.length > 1) {
      openTab(`neurodata-items:${selectedItemViews.join("@")}`);
    }
  }, [selectedItemViews, openTab]);
  return (
    <div>
      {selectedItemViews.length > 0 ? (
        <Hyperlink onClick={handleOpenView} title="Open view">
          <FaEye />
          &nbsp;{cc}
        </Hyperlink>
      ) : (
        <span>No views selected</span>
      )}
      <SpecialTimeAlignedSeriesButton
        selectedItemViews={selectedItemViews}
        openTab={openTab}
      />
    </div>
  );
};

type SpecialTimeAlignedSeriesButtonProps = {
  selectedItemViews: string[];
  openTab: (path: string) => void;
};

const SpecialTimeAlignedSeriesButton: FunctionComponent<
  SpecialTimeAlignedSeriesButtonProps
> = ({ selectedItemViews, openTab }) => {
  const { roiResponseSeriesSelectedItemPath, timeIntervalsSelectedItemPath } =
    useMemo(() => {
      if (selectedItemViews.length !== 2)
        return {
          roiResponseSeriesSelectedItem: undefined,
          timeIntervalsSelectedItem: undefined,
        };
      const roiResponseSeriesSelectedItemPath = selectedItemViews
        .find(
          (a) =>
            a.endsWith("|RoiResponseSeries") ||
            a.endsWith("|FiberPhotometryResponseSeries"),
        )
        ?.split("|")[0]
        ?.split(":")[1];
      const timeIntervalsSelectedItemPath = selectedItemViews
        .find((a) => a.endsWith("|TimeIntervals"))
        ?.split("|")[0]
        ?.split(":")[1];
      return {
        roiResponseSeriesSelectedItemPath,
        timeIntervalsSelectedItemPath,
      };
    }, [selectedItemViews]);
  const enabled =
    roiResponseSeriesSelectedItemPath && timeIntervalsSelectedItemPath;
  if (!enabled) return <span />;
  return (
    <div>
      <Hyperlink
        onClick={() => {
          if (!roiResponseSeriesSelectedItemPath) return;
          if (!timeIntervalsSelectedItemPath) return;
          openTab(
            `view:TimeAlignedSeries|${timeIntervalsSelectedItemPath}^${roiResponseSeriesSelectedItemPath}`,
          );
        }}
      >
        Open TimeAlignedSeries for selected items
      </Hyperlink>
    </div>
  );
};

export default SelectedNeurodataItemsWidget;
