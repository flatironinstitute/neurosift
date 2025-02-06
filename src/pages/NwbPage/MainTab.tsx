import { Box, Grid, Paper } from "@mui/material";
import { useEffect, useReducer, useState } from "react";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import Hdf5View from "./Hdf5View";
import { getNwbGroup } from "./nwbInterface";
import NwbHierarchyView from "./NwbHierarchyView";
import "../../css/NwbPage.css";
import { SetupNwbFileSpecificationsProvider } from "./SpecificationsView/SetupNwbFileSpecificationsProvider";
import SpecificationsView from "./SpecificationsView/SpecificationsView";
import TimeseriesAlignmentView from "./TimeseriesAlignmentView";
import viewsReducer from "./viewsReducer";

import { NwbObjectViewPlugin } from "./plugins/pluginInterface";

type MainTabProps = {
  nwbUrl: string;
  onOpenObjectInNewTab?: (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => void;
  onOpenObjectsInNewTab?: (paths: string[]) => void;
};

const MainTab = ({
  nwbUrl,
  onOpenObjectInNewTab,
  onOpenObjectsInNewTab,
}: MainTabProps) => {
  const [views, dispatch] = useReducer(viewsReducer, []);
  const [expandedViews, setExpandedViews] = useState<Set<string>>(new Set());
  const [defaultUnitsPath, setDefaultUnitsPath] = useState<string | undefined>(
    undefined,
  );

  // Check if /units exists and has neurodata_type "Units"
  useEffect(() => {
    const checkUnits = async () => {
      const group = await getNwbGroup(nwbUrl, "/units");
      if (group && group.attrs.neurodata_type === "Units") {
        setDefaultUnitsPath("/units");
      }
    };
    checkUnits();
  }, [nwbUrl]);

  // Initialize expansion state with default values
  useEffect(() => {
    if (views.length === 0) {
      const initialViews = [
        {
          type: "nwbHierarchy" as const,
          label: "Neurodata",
          closeable: false as const,
          defaultExpanded: true,
        },
        {
          type: "Hdf5View" as const,
          label: "HDF5",
          closeable: false as const,
          defaultExpanded: false,
        },
        {
          type: "TimeseriesAlignment" as const,
          label: "Timeseries Alignment",
          closeable: false as const,
          defaultExpanded: false,
        },
        {
          type: "specifications" as const,
          label: "Specifications",
          closeable: false as const,
          defaultExpanded: false,
        },
      ];

      // Initialize each view
      initialViews.forEach((view) => {
        dispatch({
          type: "OPEN_VIEW",
          view,
        });
        if (view.defaultExpanded) {
          setExpandedViews((prev) => new Set([...prev, view.type]));
        }
      });
    }
  }, [views.length]);

  return (
    <span className="MainTab">
      <Grid container spacing={0}>
        {views.map((view) => (
          <Grid item xs={12} key={view.type}>
            <Paper sx={{ p: 2, position: "relative" }}>
              <div>
                <div
                  style={{
                    cursor: "pointer",
                    padding: "10px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  onClick={() => {
                    setExpandedViews((prev) => {
                      const next = new Set(prev);
                      if (next.has(view.type)) {
                        next.delete(view.type);
                      } else {
                        next.add(view.type);
                      }
                      return next;
                    });
                  }}
                >
                  {expandedViews.has(view.type) ? (
                    <FaChevronDown />
                  ) : (
                    <FaChevronRight />
                  )}
                  <span style={{ marginLeft: "5px" }}>{view.label}</span>
                </div>
                {expandedViews.has(view.type) && (
                  <Box sx={{ mt: 1 }}>
                    {view.type === "nwbHierarchy" && (
                      <NwbHierarchyView
                        nwbUrl={nwbUrl}
                        onOpenObjectInNewTab={onOpenObjectInNewTab}
                        onOpenObjectsInNewTab={onOpenObjectsInNewTab}
                        isExpanded={expandedViews.has(view.type)}
                        defaultUnitsPath={defaultUnitsPath}
                        onSetDefaultUnitsPath={setDefaultUnitsPath}
                      />
                    )}
                    {view.type === "TimeseriesAlignment" && (
                      <TimeseriesAlignmentView
                        nwbUrl={nwbUrl}
                        width={800}
                        isExpanded={expandedViews.has(view.type)}
                        onOpenTimeseriesItem={(path) => {
                          onOpenObjectInNewTab?.(path);
                        }}
                      />
                    )}
                    {view.type === "Hdf5View" && (
                      <Hdf5View
                        nwbUrl={nwbUrl}
                        width={800}
                        isExpanded={expandedViews.has(view.type)}
                      />
                    )}
                    {view.type === "specifications" && (
                      <SetupNwbFileSpecificationsProvider nwbUrl={nwbUrl}>
                        <SpecificationsView />
                      </SetupNwbFileSpecificationsProvider>
                    )}
                  </Box>
                )}
              </div>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </span>
  );
};

export default MainTab;
