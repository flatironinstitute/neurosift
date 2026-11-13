import type { TimeAxisTarget } from "@shared/context-timeseries-selection-2";
import type { TimeWindowValue } from "@ui";
import { PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  clampPixel,
  dragAction,
  selectedWindow,
  type AxisSpan,
  type DragMode,
} from "./timeSelect";
import { useTimeWindow } from "./useTimeWindow";

type Drag = {
  pointerId: number;
  x0: number;
  x1: number;
  axis: AxisSpan;
  window: TimeWindowValue;
  /** The axis's top and height, and the wrapper's box, in client pixels. */
  top: number;
  height: number;
  frameLeft: number;
  frameTop: number;
  frameWidth: number;
};

/** Where the selection band sits in the plot's wrapper, and the stretch it covers. */
export type Selection = {
  left: number;
  top: number;
  width: number;
  height: number;
  frameWidth: number;
  value?: TimeWindowValue;
};

/**
 * Drag across a plot to zoom the shared time window: a plain drag in Select mode, Shift+drag in Pan.
 * `onStart` runs as a drag begins, so playback can pause.
 */
export function useTimeSelect(onStart?: () => void) {
  const time = useTimeWindow();
  const [mode, setMode] = useState<DragMode>("pan");
  const [target, setTarget] = useState<TimeAxisTarget | null>(null);
  const [available, setAvailable] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState(false);
  const [shift, setShift] = useState(false);
  const dragRef = useRef<Drag | null>(null);
  const update = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const register = useCallback((next: TimeAxisTarget | null) => {
    setTarget(next);
    if (next) setAvailable(true);
  }, []);

  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drag]);

  const onPointerDownCapture = (e: PointerEvent<HTMLElement>) => {
    if (!target || e.button !== 0) return;
    if (dragAction(mode, e.shiftKey) !== "select") return;
    const box = target.element.getBoundingClientRect();
    const { insets } = target;
    const axis = {
      left: box.left + insets.left,
      width: box.width - insets.left - insets.right,
    };
    const top = box.top + insets.top;
    const height = box.height - insets.top - insets.bottom;
    const inside =
      e.clientX >= axis.left &&
      e.clientX <= axis.left + axis.width &&
      e.clientY >= box.top &&
      e.clientY <= box.bottom;
    if (axis.width <= 0 || height <= 0 || !inside) return;
    // Cancelling pointerdown keeps the plot's own mouse drag (pan, box zoom) from starting.
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const frame = e.currentTarget.getBoundingClientRect();
    onStart?.();
    update({
      pointerId: e.pointerId,
      x0: e.clientX,
      x1: e.clientX,
      axis,
      window: time.value,
      top,
      height,
      frameLeft: frame.left,
      frameTop: frame.top,
      frameWidth: frame.width,
    });
  };

  useEffect(() => {
    if (!over) return;
    const onKey = (e: KeyboardEvent) => setShift(e.shiftKey);
    const onBlur = () => setShift(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      setShift(false);
    };
  }, [over]);

  const onPointerEnter = (e: PointerEvent<HTMLElement>) => {
    setOver(true);
    setShift(e.shiftKey);
  };
  const onPointerLeave = () => setOver(false);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (d?.pointerId === e.pointerId) update({ ...d, x1: e.clientX });
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (d?.pointerId !== e.pointerId) return;
    update(null);
    const next = selectedWindow(
      d.x0,
      e.clientX,
      d.axis,
      d.window,
      time.session,
    );
    if (next) time.onChange(next);
  };

  const cancel = () => update(null);

  let selection: Selection | undefined;
  if (drag) {
    const a = clampPixel(drag.x0, drag.axis);
    const b = clampPixel(drag.x1, drag.axis);
    selection = {
      left: Math.min(a, b) - drag.frameLeft,
      top: drag.top - drag.frameTop,
      width: Math.abs(b - a),
      height: drag.height,
      frameWidth: drag.frameWidth,
      value: selectedWindow(
        drag.x0,
        drag.x1,
        drag.axis,
        drag.window,
        time.session,
      ),
    };
  }

  return {
    mode,
    /** What a plain drag does now: Select while Shift is held over the plot in Pan. */
    cursorMode: dragAction(mode, shift),
    setMode,
    /** True once a plot with a time axis has registered, so the switch shows. */
    available,
    register,
    selection,
    handlers: {
      onPointerDownCapture,
      onPointerMove,
      onPointerUp,
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
      onPointerEnter,
      onPointerLeave,
    },
  };
}
