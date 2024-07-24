import React, { useMemo, useRef } from "react";
import { getRectFromPointPair, Vec2, Vec4 } from "./Geometry";

// NOTE: Tracks drag state in *pixelspace*.

const defaultDragStyle = "rgba(196, 196, 196, 0.5)";

export interface DragState {
  isActive: boolean; // whether we are in an active dragging state
  dragAnchor?: Vec2; // The position where dragging began (pixels)
  dragRect?: Vec4; // The drag rect. [0],[1] are the upper left corner, [2], [3] are width & height.
  shift?: boolean; // whether the shift key is being pressed
}

export type DragActionType =
  | "COMPUTE_DRAG"
  | "END_DRAG"
  | "RESET_DRAG"
  | "PARTIAL";

export interface DragAction {
  type: DragActionType; // type of action
  mouseButtonIsDown?: boolean;
  point?: Vec2; // The position (pixels)
  shift?: boolean; // Whether shift key is being pressed
}

export const COMPUTE_DRAG: DragActionType = "COMPUTE_DRAG";
export const END_DRAG: DragActionType = "END_DRAG";
export const RESET_DRAG: DragActionType = "RESET_DRAG";
export const INCOMPLETE_ACTION: DragActionType = "PARTIAL";

export const getDragActionFromEvent = (e: React.MouseEvent): DragAction => {
  const boundingRect = e.currentTarget.getBoundingClientRect();
  const point: Vec2 = [e.clientX - boundingRect.x, e.clientY - boundingRect.y];
  const mouseButtonIsDown = e.buttons === 1;
  const shift = e.shiftKey;
  return { type: INCOMPLETE_ACTION, mouseButtonIsDown, point, shift };
};

// This isn't a "real" Reducer, in that it isn't using any of React's state-management features.
// It's just a function that takes a current state and action, and applies the action to return
// a new state.
export const dragReducer = (
  state: DragState,
  action: DragAction,
): DragState => {
  const { dragAnchor, dragRect } = state;
  const { type, mouseButtonIsDown, point, shift } = action;
  const DRAG_START_TOLERANCE = 4;

  switch (type) {
    case RESET_DRAG: // should happen on mousedown
      return { isActive: false };
    case END_DRAG: {
      // should happen on mouseup
      const rect =
        dragAnchor && point
          ? getRectFromPointPair(dragAnchor, point)
          : undefined;
      return {
        isActive: false,
        dragRect: rect,
        shift: shift,
      };
    }
    case COMPUTE_DRAG: // should happen on mouse move
      // Clear the state if the mouse button is up
      // (Any previous state should've already been finalized on the mouse up event itself)
      if (!mouseButtonIsDown)
        return {
          isActive: false,
        };
      if (!point)
        throw Error(
          "ASSERTION FAILED: COMPUTE_DRAG but the mousemove event had no location.",
        );

      // If the drag anchor isn't set, just set it to the current point.
      // If the drag anchor is set, then:
      // - if there's already an active drag, update the drag rectangle.
      // - If there isn't an active drag, start one, IFF the point has moved far enough from the original click.
      return !dragAnchor
        ? {
            isActive: false,
            dragAnchor: point,
          }
        : dragRect ||
            Math.abs(point[0] - dragAnchor[0]) > DRAG_START_TOLERANCE ||
            Math.abs(point[1] - dragAnchor[1]) > DRAG_START_TOLERANCE
          ? {
              ...state,
              isActive: true,
              dragRect: getRectFromPointPair(dragAnchor, point),
            }
          : state;
    default: {
      throw Error(`Invalid mode for drag reducer: ${type}`);
    }
  }
};

const paintDragRectangle = (
  canvasRef: React.ForwardedRef<HTMLCanvasElement>,
  dragState: DragState | undefined,
  dragStyle?: string,
) => {
  if (!dragState || !canvasRef) return;
  if (typeof canvasRef === "function") return;
  const canvas = canvasRef.current;
  const ctxt = canvas && canvas.getContext("2d");
  if (!ctxt) {
    return;
  }

  ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);
  if (dragState.isActive) {
    const rect = dragState.dragRect || [0, 0, 0, 0];
    ctxt.fillStyle = dragStyle ?? defaultDragStyle;
    ctxt.fillRect(rect[0], rect[1], rect[2], rect[3]);
  }
};

/*
    This section handles event management, allowing the DragCanvas component to function
    with minimal requirements for the operational React component that makes use of the
    DragCanvas to overlay on one of its own Canvas elements. (I refer to the component that
    has an instance of this one as the "Patron" component.)

    We do not want to attach instance methods or store state in a particular
    DragCanvas instance, because the Patron component may need to make decisions based on
    the drag state (like styling Patron-level entities based on whether they fall
    within the current drag rect). Moreover, we want state updates to be atomic at the Patron
    component level (i.e. the Patron component should have a single State and maintain this
    via a reducer, rather than using setState() for a separate DragState state variable,
    since a separate useState() can cause race conditions & loops when the Patron rerenders.)

    The solution is for the Patron component to delegate part of its state to
    the DragCanvas for management. The DragState definition exposes three
    top-level functions that handle Drag-relevant events. They are implemented as pure
    functions (not being attached to a particular DragCanvas instance) which communicate with
    the Patron through the delegated state and call its reducer when needed.

    The exposed functions handle mouse movement, mouseup, and mousedown events. The Patron must
    listen for these events and call the handlers when needed. The handlers debounce the drag
    state (i.e. limit the rate at which changes to DragState are made) with no further input from
    the Patron. The mousedown and mouseup event handlers always do something, so those return void;
    but the mousemove event handler returns true if there was an active drag state being updated,
    and false if there is no active drag (i.e. mouse movement without any ongoing drag). This allows
    the Patron the option of taking action to respond to mouse movement events conditionally
    based on whether there's an active drag state (e.g. not applying a hover highlight if the user
    is dragging).

    Because Patron reducer logic varies and may be informed by Patron state, these functions
    also take a set of additional parameters which will be passed to the reducer. The contract for
    these handlers is that they will call the Patron reducer using the received state values,
    adding a DragAction appropriate to the managed drag state.

    NOTE: As currently designed, the Patron reducer MUST CALL THE DRAGREDUCER defined in DragCanvas.
    DragCanvas handles *requesting* updates, but can't handle the logic of determining the new
    drag state without the context of the rest of the Patron state.
*/

interface DebounceProps {
  nextDragStateUpdate: React.MutableRefObject<DragAction | null>;
  nextFrame: React.MutableRefObject<number>;
  reducer: (props: any) => any; // reducer that manages the client component's state.
  reducerOtherProps: any; // props object for everything your reducer needs that ISN'T a DragAction.
}
// This function debounces drag state updates.
// It uses requestAnimationFrame() to schedule updates at an appropriate rate.
// When the timer expires, if there's no pending update, it cancels the cycle.
// If there is a pending update, it applies the update & sets another timer.
const updateDragState = (props: DebounceProps) => {
  const { nextDragStateUpdate, nextFrame, reducer, reducerOtherProps } = props;
  if (nextDragStateUpdate.current === null) {
    window.cancelAnimationFrame(nextFrame.current);
    nextFrame.current = 0;
  } else {
    reducer({ ...reducerOtherProps, dragAction: nextDragStateUpdate.current });
    // We cannot pass props to the animation frame callback. But we still need to use the outer
    // class' delegated state (via the ref vars). So we save them in a closure.
    // This works because the refs never change.
    // POTENTIAL HOLE: If dispatchStateOtherProps has a value that might change, that could be
    // a source of trouble, because we will be reusing the current one.
    const closure = () => updateDragState(props);
    nextFrame.current = requestAnimationFrame(closure);
  }
  nextDragStateUpdate.current = null;
};

export const handleMouseMoveIfDragging = (
  e: React.MouseEvent,
  delegatedProps: DebounceProps,
): boolean => {
  const { nextDragStateUpdate, nextFrame } = delegatedProps;
  const action: DragAction = {
    ...getDragActionFromEvent(e),
    type: COMPUTE_DRAG,
  };
  // with mouse button down, this is a drag situation.
  // But we debounce drag-state updates. So check if we're in the cooldown between updates.
  // If a change is in the queue, update the next change to apply; otherwise, schedule an update.
  if (action.mouseButtonIsDown) {
    nextDragStateUpdate.current = action;
    if (nextFrame.current === 0) {
      updateDragState(delegatedProps);
    }
    return true; // we handled it, so caller does not need to unless it wants to handle everything
  }
  return false; // we did not handle it, so caller definitely needs to handle the event as appropriate
};

export const handleMouseDownIfDragging = (
  e: React.MouseEvent,
  delegatedProps: DebounceProps,
): void => {
  const { nextDragStateUpdate, reducer, reducerOtherProps } = delegatedProps;
  nextDragStateUpdate.current = null;
  reducer({ ...reducerOtherProps, dragAction: { type: RESET_DRAG } });
};

export const handleMouseUpIfDragging = (
  e: React.MouseEvent,
  delegatedProps: DebounceProps,
): void => {
  const { nextDragStateUpdate, reducer, reducerOtherProps } = delegatedProps;
  nextDragStateUpdate.current = null;
  reducer({
    ...reducerOtherProps,
    dragAction: { ...getDragActionFromEvent(e), type: END_DRAG },
  });
};

interface DragCanvasProps {
  width: number;
  height: number;
  newState: DragState;
  dragStyle?: string;
}

const DragCanvas = (props: DragCanvasProps) => {
  const { width, height, newState, dragStyle } = props;
  const ref = useRef<HTMLCanvasElement | null>(null);

  const canvas = useMemo(() => {
    return (
      <canvas
        ref={ref}
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0 }}
      />
    );
  }, [width, height]);
  paintDragRectangle(ref, newState, dragStyle);

  return canvas;
};

export default DragCanvas;
