import {
  DragAction,
  dragReducer,
  DragState,
  pointSpanToRegion,
  Vec2,
} from "./figurl-canvas";
import {
  Electrode,
  LayoutMode,
  PixelSpaceElectrode,
} from "./ElectrodeGeometry";
import {
  computeElectrodeLocations,
  getDraggedElectrodeIds,
  getElectrodeAtPoint,
  xMargin as xMarginDefault,
} from "./electrodeGeometryLayout";

export interface ElectrodeGeometryState {
  convertedElectrodes: PixelSpaceElectrode[];
  pixelRadius: number;
  draggedElectrodeIds: (number | string)[];
  hoveredElectrodeId?: number | string;
  pendingSelectedElectrodeIds: (number | string)[];
  xMarginWidth: number;
  dragState: DragState;
}

export type ElectrodeGeometryActionType =
  | "INITIALIZE"
  | "UPDATESELECTED"
  | "DRAGUPDATE"
  | "UPDATEHOVER"
  | "UPDATECLICK";

type InitializeElectrodesElectrodeGeometryAction = {
  type: "INITIALIZE";
  electrodes: Electrode[];
  width: number;
  height: number;
  maxElectrodePixelRadius: number;
  layoutMode: LayoutMode;
  disableAutoRotate?: boolean;
};

type UpdateSelectionsElectrodeGeometryAction = {
  type: "UPDATESELECTED";
  selectedElectrodeIds: number[];
};

type UpdateDragElectrodeGeometryAction = {
  type: "DRAGUPDATE";
  dragAction: DragAction;
  selectedElectrodeIds?: number[];
};

type UpdateHoverElectrodeGeometryAction = {
  type: "UPDATEHOVER";
  point: Vec2; // [x, y] within the local canvas
};

type UpdateClickElectrodeGeometryAction = {
  type: "UPDATECLICK";
  point: Vec2;
  shift?: boolean;
  ctrl?: boolean;
  selectedElectrodeIds: (number | string)[];
};

export type ElectrodeGeometryAction =
  | InitializeElectrodesElectrodeGeometryAction
  | UpdateSelectionsElectrodeGeometryAction
  | UpdateDragElectrodeGeometryAction
  | UpdateHoverElectrodeGeometryAction
  | UpdateClickElectrodeGeometryAction;

const emptyDragState = { isActive: false };

export const electrodeGeometryReducer = (
  state: ElectrodeGeometryState,
  action: ElectrodeGeometryAction,
): ElectrodeGeometryState => {
  if (action.type === "INITIALIZE") {
    const { width, height, electrodes, layoutMode, maxElectrodePixelRadius } =
      action;
    const { convertedElectrodes, pixelRadius, xMargin } =
      computeElectrodeLocations(
        width,
        height,
        electrodes,
        layoutMode,
        maxElectrodePixelRadius,
        { disableAutoRotate: action.disableAutoRotate },
      );
    return {
      ...state,
      convertedElectrodes: convertedElectrodes,
      pixelRadius: pixelRadius,
      draggedElectrodeIds: [],
      hoveredElectrodeId: undefined,
      dragState: emptyDragState,
      xMarginWidth: xMargin ?? xMarginDefault,
    };
  } else if (action.type === "DRAGUPDATE") {
    const newDrag = dragReducer(state.dragState, action.dragAction);
    if (!newDrag.isActive && newDrag.dragRect) {
      // We have a completed drag whose area has not yet been reset. Therefore a drag has just ended.
      // Nothing can be dragged, and anything in the region should be selected.
      const dragRectAsMaxMin = pointSpanToRegion(newDrag.dragRect);
      const selectedByDrag = getDraggedElectrodeIds(
        state.convertedElectrodes,
        dragRectAsMaxMin,
        state.pixelRadius,
      );
      const finalSelection = action.dragAction.shift
        ? [...selectedByDrag, ...(action.selectedElectrodeIds || [])]
        : selectedByDrag;
      return {
        ...state,
        draggedElectrodeIds: [],
        hoveredElectrodeId: undefined,
        pendingSelectedElectrodeIds: finalSelection,
        dragState: emptyDragState,
      };
    } else if (newDrag.dragRect) {
      // updated the drag rect but not final yet: anything in the drag rect is dragged, but not selected.
      const dragRectAsMaxMin = pointSpanToRegion(newDrag.dragRect);
      const selectedByDrag = getDraggedElectrodeIds(
        state.convertedElectrodes,
        dragRectAsMaxMin,
        state.pixelRadius,
      );
      // If we wouldn't change anything, don't bother sending an update
      if (
        selectedByDrag.length === state.draggedElectrodeIds.length &&
        selectedByDrag.filter((id) => !state.draggedElectrodeIds.includes(id))
          .length === 0
      ) {
        return {
          ...state,
          hoveredElectrodeId: undefined,
          dragState: newDrag,
        };
      }
      return {
        ...state,
        hoveredElectrodeId: undefined,
        draggedElectrodeIds: selectedByDrag,
        dragState: newDrag,
      };
    } else {
      return { ...state, dragState: newDrag };
    }
  } else if (action.type === "UPDATEHOVER") {
    const newHovered = getElectrodeAtPoint(
      state.convertedElectrodes,
      state.pixelRadius,
      action.point,
    );
    return newHovered === state.hoveredElectrodeId
      ? state
      : { ...state, hoveredElectrodeId: newHovered };
  } else if (action.type === "UPDATECLICK") {
    const clickedId = getElectrodeAtPoint(
      state.convertedElectrodes,
      state.pixelRadius,
      action.point,
    );
    // Suppose we clicked nothing. If no modifier was down & there's a selection to clear, clear it;
    // otherwise nothing actually happens so return the existing state.
    if (clickedId === undefined) {
      return !(action.shift || action.ctrl) &&
        action.selectedElectrodeIds.length > 0
        ? {
            ...state,
            pendingSelectedElectrodeIds: [],
          }
        : state;
    }
    // Something was clicked. How it's handled depends on the modifier keys.
    const newSelection = action.ctrl // ctrl-click means toggle state of target electrode
      ? action.selectedElectrodeIds.includes(clickedId)
        ? action.selectedElectrodeIds.filter((id) => id !== clickedId)
        : [...action.selectedElectrodeIds, clickedId]
      : action.shift
        ? [...action.selectedElectrodeIds, clickedId] // shift-click: add new item to selection
        : [clickedId]; // unmodified click: set selection to target only
    return {
      ...state,
      hoveredElectrodeId: undefined,
      pendingSelectedElectrodeIds: newSelection,
    };
  } else {
    console.log(`Error: unrecognized verb in electrode geometry reducer.`);
    return state;
  }
};
