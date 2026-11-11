import { useMemo } from "react";
import TimeWidgetToolbarEntries from "./TimeWidgetToolbarEntries";
import { ToolbarItem } from "./Toolbars";
import { useTimeRange } from "@shared/context-timeseries-selection-2";

const useActionToolbar = (): ToolbarItem[] => {
  const { zoomTimeseriesSelection, panTimeseriesSelection } = useTimeRange();
  return useMemo(() => {
    if (!zoomTimeseriesSelection || !panTimeseriesSelection) return [];
    return TimeWidgetToolbarEntries({
      zoomTimeseriesSelection,
      panTimeseriesSelection,
    });
  }, [zoomTimeseriesSelection, panTimeseriesSelection]);
};

export default useActionToolbar;
