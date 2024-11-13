import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  AffineTransform,
  applyAffineTransform,
  applyAffineTransformInv,
  detAffineTransform,
} from "../../../../../misc/AffineTransform";
import {
  BaseCanvas,
  DragAction,
  DragCanvas,
  handleMouseDownIfDragging,
  handleMouseMoveIfDragging,
  handleMouseUpIfDragging,
  Vec2,
} from "./figurl-canvas";
import { useWheelZoom } from "../WaveformWidget";
import {
  defaultColors,
  ElectrodeColors,
  paint,
} from "./electrodeGeometryPainting";
import {
  ElectrodeGeometryActionType,
  electrodeGeometryReducer,
} from "./electrodeGeometryStateManagement";
import SvgElectrodeLayout from "./ElectrodeGeometrySvg";
import { useSelectedElectrodes } from "../../../../../contexts/context-timeseries-selection";

const USE_SVG = false;

export const defaultMaxPixelRadius = 25;

export type Electrode = {
  id: number | string;
  label: string;
  x: number;
  y: number;
};

export type PixelSpaceElectrode = {
  e: Electrode;
  pixelX: number;
  pixelY: number;
};

export type LayoutMode = "geom" | "vertical";

interface WidgetProps {
  electrodes: Electrode[];
  width: number;
  height: number;
  colors?: ElectrodeColors;
  layoutMode?: "geom" | "vertical";
  showLabels?: boolean;
  maxElectrodePixelRadius?: number;
  offsetLabels?: boolean;
  disableSelection?: boolean;
  disableAutoRotate?: boolean;
  affineTransform?: AffineTransform;
}

const defaultElectrodeLayerProps = {
  showLabels: true,
  maxElectrodePixelRadius: defaultMaxPixelRadius,
};

const getEventPoint = (e: React.MouseEvent) => {
  const boundingRect = e.currentTarget.getBoundingClientRect();
  const point: Vec2 = [e.clientX - boundingRect.x, e.clientY - boundingRect.y];
  return point;
};

const ElectrodeGeometry = (props: WidgetProps) => {
  const { width, height, electrodes, disableAutoRotate, affineTransform } =
    props;
  const { selectedElectrodeIds, setSelectedElectrodeIds } =
    useSelectedElectrodes();
  const disableSelection = props.disableSelection ?? false;
  const offsetLabels = props.offsetLabels ?? false;
  const colors = props.colors ?? defaultColors;
  const layoutMode: LayoutMode = props.layoutMode ?? "geom";
  const maxElectrodePixelRadius =
    props.maxElectrodePixelRadius ||
    defaultElectrodeLayerProps.maxElectrodePixelRadius;
  const [state, dispatchState] = useReducer(electrodeGeometryReducer, {
    convertedElectrodes: [],
    pixelRadius: -1,
    draggedElectrodeIds: [],
    pendingSelectedElectrodeIds: selectedElectrodeIds || [],
    dragState: { isActive: false },
    xMarginWidth: -1,
  });
  const { affineTransform: affineTransform2, handleWheel } = useWheelZoom(
    width,
    height,
    { shift: true, alt: false },
  );
  const state2 = useMemo(() => {
    const convertedElectrodes = state.convertedElectrodes.map((e) => {
      const pt = applyAffineTransform(affineTransform2, {
        x: e.pixelX,
        y: e.pixelY,
      });
      return {
        ...e,
        pixelX: pt.x,
        pixelY: pt.y,
      };
    });
    return {
      ...state,
      convertedElectrodes,
      pixelRadius:
        state.pixelRadius * Math.sqrt(detAffineTransform(affineTransform2)),
    };
  }, [affineTransform2, state]);

  const getEventPointWithAffineTransform = useMemo(
    () =>
      (e: React.MouseEvent): Vec2 => {
        const point = getEventPoint(e);
        const point2 = applyAffineTransformInv(affineTransform2, {
          x: point[0],
          y: point[1],
        });
        return [point2.x, point2.y];
      },
    [affineTransform2],
  );

  useEffect(() => {
    const type: ElectrodeGeometryActionType = "INITIALIZE";
    const a = {
      type: type,
      electrodes: electrodes,
      width: width,
      height: height,
      maxElectrodePixelRadius: maxElectrodePixelRadius,
      layoutMode: layoutMode,
      disableAutoRotate,
    };
    dispatchState(a);
  }, [
    width,
    height,
    electrodes,
    layoutMode,
    maxElectrodePixelRadius,
    disableAutoRotate,
  ]);

  // Call to update selected electrode IDs if our opinion differs from the one that was passed in
  // (but only if our opinion has changed)
  // TODO: Does this create a race condition??
  useEffect(() => {
    setSelectedElectrodeIds(state.pendingSelectedElectrodeIds);
  }, [setSelectedElectrodeIds, state.pendingSelectedElectrodeIds]);

  const nextDragStateUpdate = useRef<DragAction | null>(null);
  const nextFrame = useRef<number>(0);
  const dragCanvas = disableSelection || (
    <DragCanvas width={width} height={height} newState={state.dragState} />
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const wasHandled = handleMouseMoveIfDragging(e, {
        nextDragStateUpdate,
        nextFrame,
        reducer: dispatchState,
        reducerOtherProps: { type: "DRAGUPDATE" },
      });
      if (!wasHandled) {
        const point = getEventPointWithAffineTransform(e);
        dispatchState({
          type: "UPDATEHOVER",
          point,
        });
      }
    },
    [getEventPointWithAffineTransform],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleMouseDownIfDragging(e, {
      nextDragStateUpdate,
      nextFrame,
      reducer: dispatchState,
      reducerOtherProps: { type: "DRAGUPDATE" },
    });
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (state.dragState.isActive) {
        // mouseup with an active drag = end the drag & that's it.
        handleMouseUpIfDragging(e, {
          nextDragStateUpdate,
          nextFrame,
          reducer: dispatchState,
          reducerOtherProps: {
            type: "DRAGUPDATE",
            selectedElectrodeIds: selectedElectrodeIds,
          },
        });
      } else {
        // if there was no active drag, then the mouseup is a click. Treat it as such.
        const point = getEventPointWithAffineTransform(e);
        dispatchState({
          type: "UPDATECLICK",
          point: point,
          shift: e.shiftKey,
          ctrl: e.ctrlKey,
          selectedElectrodeIds: selectedElectrodeIds || [],
        });
      }
    },
    [
      state.dragState.isActive,
      selectedElectrodeIds,
      getEventPointWithAffineTransform,
    ],
  );

  const canvas = useMemo(() => {
    const data = {
      pixelElectrodes: state2.convertedElectrodes,
      selectedElectrodeIds: selectedElectrodeIds || [],
      hoveredElectrodeId: state.hoveredElectrodeId,
      draggedElectrodeIds: state.draggedElectrodeIds,
      pixelRadius: state2.pixelRadius,
      showLabels: props.showLabels ?? defaultElectrodeLayerProps.showLabels,
      offsetLabels: offsetLabels,
      layoutMode: props.layoutMode ?? "geom",
      xMargin: state.xMarginWidth,
      colors: colors,
      affineTransform,
    };
    return (
      <BaseCanvas width={width} height={height} draw={paint} drawData={data} />
    );
  }, [
    width,
    height,
    state2.convertedElectrodes,
    selectedElectrodeIds,
    state.hoveredElectrodeId,
    state.draggedElectrodeIds,
    state2.pixelRadius,
    props.showLabels,
    offsetLabels,
    props.layoutMode,
    state.xMarginWidth,
    colors,
    affineTransform,
  ]);

  const svg = useMemo(() => {
    return (
      USE_SVG && (
        <SvgElectrodeLayout
          pixelElectrodes={state.convertedElectrodes}
          selectedElectrodeIds={selectedElectrodeIds || []}
          hoveredElectrodeId={state.hoveredElectrodeId}
          draggedElectrodeIds={state.draggedElectrodeIds}
          pixelRadius={state.pixelRadius}
          showLabels={props.showLabels ?? defaultElectrodeLayerProps.showLabels}
          offsetLabels={offsetLabels}
          layoutMode={props.layoutMode ?? "geom"}
          xMargin={state.xMarginWidth}
          width={width}
          height={height}
          colors={colors}
        />
      )
    );
  }, [
    state.convertedElectrodes,
    selectedElectrodeIds,
    state.hoveredElectrodeId,
    state.draggedElectrodeIds,
    state.pixelRadius,
    props.showLabels,
    offsetLabels,
    props.layoutMode,
    state.xMarginWidth,
    width,
    height,
    colors,
  ]);

  return (
    <div
      style={{ width, height, position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      {dragCanvas}
      {USE_SVG && svg}
      {!USE_SVG && canvas}
    </div>
  );
};

export default ElectrodeGeometry;
