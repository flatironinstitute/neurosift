import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "../Button/Button";
import { IconButton } from "../IconButton/IconButton";
import { useCssVars } from "../useCssVars";
import {
  PAN_STEP,
  ZOOM_STEP,
  atActualPixels,
  atMaxScale,
  atMinScale,
  center,
  panBy,
  resolveView,
  settle,
  zoomBy,
  zoomReadout,
  zoomTo,
  type ImageZoomValue,
  type Point,
  type Size,
  type ZoomView,
} from "./zoomMath";
import "../base.css";
import "../TimeControls/TimeControls.css";
import "./ImageZoom.css";

interface ImageZoomProps {
  /** The image's name; the viewport is named after it, with its keys. */
  label: string;
  /** The image's size in pixels; children draw at this size. */
  width: number;
  height: number;
  value: ImageZoomValue;
  onChange: (value: ImageZoomValue) => void;
  /** The size it takes, zoom bar included; it narrows with its container. */
  viewWidth: number;
  viewHeight: number;
  /** Keys the viewport doesn't use, such as Space to play. */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  /** A canvas or image at the image's size. */
  children: ReactNode;
}

const WHEEL_SPEED = 0.002;
const PINCH_SPEED = 0.01;
const LINE_HEIGHT = 16;

/** Zoom and pan over one picture: buttons, wheel, pinch, drag, double-click and keys. */
export function ImageZoom({
  label,
  width,
  height,
  value,
  onChange,
  viewWidth,
  viewHeight,
  onKeyDown,
  children,
}: ImageZoomProps) {
  const frame = useCssVars<HTMLDivElement>({
    "--zoom-view-width": viewWidth,
    "--zoom-view-height": viewHeight,
  });
  const viewport = useRef<HTMLDivElement>(null);
  const measured = useViewportSize(viewport, {
    width: viewWidth,
    height: viewHeight,
  });
  const image = { width, height };
  const view = resolveView(value, image, measured);
  const content = useCssVars<HTMLDivElement>({
    "--zoom-x": view.x,
    "--zoom-y": view.y,
    "--zoom-scale": String(view.scale),
    "--zoom-image-width": width,
    "--zoom-image-height": height,
  });

  const latest = useRef({ view, image, measured, onChange });
  latest.current = { view, image, measured, onChange };
  const commit = (next: ZoomView) => {
    const { image, measured, onChange } = latest.current;
    latest.current.view = next;
    onChange(settle(next, image, measured));
  };
  const zoomAround = (factor: number, point?: Point) => {
    const { view, image, measured } = latest.current;
    commit(zoomBy(view, factor, point ?? center(measured), image, measured));
  };

  useWheelZoom(viewport, (factor, point) => zoomAround(factor, point));
  const pointers = usePointerGestures(
    (dx, dy) => {
      const { view, image, measured } = latest.current;
      commit(panBy(view, dx, dy, image, measured));
    },
    (factor, point) => zoomAround(factor, point),
  );

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = {
      x: measured.width * PAN_STEP,
      y: measured.height * PAN_STEP,
    };
    const pans: Record<string, [number, number]> = {
      ArrowLeft: [step.x, 0],
      ArrowRight: [-step.x, 0],
      ArrowUp: [0, step.y],
      ArrowDown: [0, -step.y],
    };
    if (event.key === "+" || event.key === "=") zoomAround(ZOOM_STEP);
    else if (event.key === "-" || event.key === "_") zoomAround(1 / ZOOM_STEP);
    else if (event.key === "0") onChange("fit");
    else if (pans[event.key])
      commit(panBy(view, ...pans[event.key], image, measured));
    else {
      onKeyDown?.(event);
      return;
    }
    event.preventDefault();
  };

  const fitted = value === "fit";
  return (
    <div ref={frame} className="ns-image-zoom">
      <div className="ns-time-group" role="group" aria-label="Zoom">
        <IconButton
          icon="zoom--out"
          label="Zoom out"
          size="sm"
          shortcut="-"
          disabled={atMinScale(view.scale, image, measured)}
          onClick={() => zoomAround(1 / ZOOM_STEP)}
        />
        <IconButton
          icon="zoom--in"
          label="Zoom in"
          size="sm"
          shortcut="="
          disabled={atMaxScale(view.scale, image, measured)}
          onClick={() => zoomAround(ZOOM_STEP)}
        />
        <span className="ns-time-divider" />
        <Button
          size="sm"
          variant="ghost"
          aria-keyshortcuts="0"
          disabled={fitted}
          onClick={() => onChange("fit")}
        >
          Fit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={atActualPixels(view.scale)}
          onClick={() =>
            commit(zoomTo(view, 1, center(measured), image, measured))
          }
        >
          100%
        </Button>
        <span className="ns-time-value ns-image-zoom-readout" role="status">
          {zoomReadout(value, view.scale)}
        </span>
      </div>
      <div
        ref={viewport}
        className="ns-image-zoom-view"
        role="group"
        tabIndex={0}
        aria-label={`${label}. Plus and minus zoom, 0 fits, arrow keys pan.`}
        onKeyDown={handleKey}
        onDoubleClick={(event) =>
          zoomAround(ZOOM_STEP, localPoint(event.currentTarget, event))
        }
        {...pointers}
      >
        <div
          ref={content}
          className={
            view.scale > 1
              ? "ns-image-zoom-content ns-image-zoom-content--pixels"
              : "ns-image-zoom-content"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function localPoint(
  element: HTMLElement,
  event: { clientX: number; clientY: number },
) {
  const box = element.getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
}

/** The viewport's drawn size, or the preferred size until it has one. */
function useViewportSize(
  ref: RefObject<HTMLDivElement | null>,
  preferred: Size,
): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size.width && size.height ? size : preferred;
}

/** Wheel and trackpad pinch (ctrl+wheel) zoom around the pointer; React's wheel listener can't prevent scrolling. */
function useWheelZoom(
  ref: RefObject<HTMLDivElement | null>,
  zoom: (factor: number, point: Point) => void,
) {
  const latest = useRef(zoom);
  latest.current = zoom;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * LINE_HEIGHT
          : event.deltaY;
      const speed = event.ctrlKey ? PINCH_SPEED : WHEEL_SPEED;
      latest.current(Math.exp(-delta * speed), localPoint(element, event));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [ref]);
}

/** One pointer drags to pan; two touch points pinch to zoom around their midpoint. */
function usePointerGestures(
  pan: (dx: number, dy: number) => void,
  zoom: (factor: number, point: Point) => void,
) {
  const down = useRef(new Map<number, Point>());
  const spread = (points: Point[]) =>
    Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  const release = (event: PointerEvent<HTMLDivElement>) => {
    down.current.delete(event.pointerId);
  };
  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      down.current.set(event.pointerId, localPoint(event.currentTarget, event));
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const before = down.current.get(event.pointerId);
      if (!before) return;
      const now = localPoint(event.currentTarget, event);
      const others = [...down.current.entries()]
        .filter(([id]) => id !== event.pointerId)
        .map(([, point]) => point);
      down.current.set(event.pointerId, now);
      if (others.length === 0) pan(now.x - before.x, now.y - before.y);
      else {
        const was = spread([before, others[0]]);
        if (was > 0)
          zoom(spread([now, others[0]]) / was, {
            x: (now.x + others[0].x) / 2,
            y: (now.y + others[0].y) / 2,
          });
      }
    },
    onPointerUp: release,
    onPointerCancel: release,
  };
}
