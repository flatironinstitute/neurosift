export type MainPanelView =
  | {
      type: "nwbHierarchy";
      label: string;
      closeable: false;
      defaultExpanded: boolean;
    }
  | {
      type: "TimeseriesAlignment";
      label: string;
      closeable: false;
      defaultExpanded: boolean;
    }
  | {
      type: "Hdf5View";
      label: string;
      closeable: false;
      defaultExpanded: boolean;
    }
  | {
      type: "specifications";
      label: string;
      closeable: false;
      defaultExpanded: boolean;
    };

type ViewsAction =
  | { type: "OPEN_VIEW"; view: MainPanelView }
  | { type: "CLOSE_VIEW"; view: MainPanelView };

const viewsReducer = (
  state: MainPanelView[],
  action: ViewsAction,
): MainPanelView[] => {
  switch (action.type) {
    case "OPEN_VIEW": {
      // Check if view already exists
      const exists = state.some((v) => {
        if (v.type !== action.view.type) return false;
        if (v.type === "nwbHierarchy") return true;
        if (v.type === "TimeseriesAlignment") return true;
        if (v.type === "Hdf5View") return true;
        if (v.type === "specifications") return true;
        return false;
      });
      if (exists) return state;

      return [...state, action.view];
    }

    case "CLOSE_VIEW":
      return state.filter((v) => {
        if (v.type !== action.view.type) return true;
        if (v.type === "nwbHierarchy") return false;
        if (v.type === "TimeseriesAlignment") return false;
        if (v.type === "Hdf5View") return false;
        if (v.type === "specifications") return false;
        return true;
      });

    default:
      return state;
  }
};

export default viewsReducer;
