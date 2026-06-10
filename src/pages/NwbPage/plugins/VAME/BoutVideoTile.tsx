import { FunctionComponent, MouseEvent, useEffect, useState } from "react";

type ViewBox = { cx: number; cy: number; zoom: number };
const DEFAULT_VIEW: ViewBox = { cx: 0.5, cy: 0.5, zoom: 1 };

type Props = {
  videoUrl: string;
  size: number;
  letter: string;
  subLabel: string;
  color: string;
  // Bumping this resets this tile's pan/zoom (the "Reset zoom" button).
  resetSignal: number;
  // Position-bar geometry on the SHARED cycle (0..1 of the longest clip):
  // windowEndFrac is where this clip ends (and goes black); boutStart/StopFrac
  // bracket the actual bout inside that window. The playhead is shared, so all
  // tiles' playheads move together.
  windowEndFrac: number;
  boutStartFrac: number;
  boutStopFrac: number;
  // Callback refs: the parent's shared loop drives the video, the time overlay,
  // the playhead, and (for the pose proof-of-concept) the overlay canvas.
  setVideoEl: (el: HTMLVideoElement | null) => void;
  setTimeEl: (el: HTMLDivElement | null) => void;
  setPlayheadEl: (el: HTMLDivElement | null) => void;
  setPoseCanvasEl: (el: HTMLCanvasElement | null) => void;
};

// One montage tile, presentational. A letter badge (matching the ethogram), a
// live session-time overlay, the square video (with pan/zoom applied), a position
// bar showing the bout extent within the window, and a drag-to-select overlay for
// region zoom.
const BoutVideoTile: FunctionComponent<Props> = ({
  videoUrl,
  size,
  letter,
  subLabel,
  color,
  resetSignal,
  windowEndFrac,
  boutStartFrac,
  boutStopFrac,
  setVideoEl,
  setTimeEl,
  setPlayheadEl,
  setPoseCanvasEl,
}) => {
  // Per-tile pan/zoom: each clip zooms independently.
  const [view, setView] = useState<ViewBox>(DEFAULT_VIEW);
  useEffect(() => {
    setView(DEFAULT_VIEW);
  }, [resetSignal]);

  const [drag, setDrag] = useState<{
    x0: number;
    y0: number;
    x: number;
    y: number;
  } | null>(null);

  const norm = (e: MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    };
  };
  const onDown = (e: MouseEvent) => {
    const { x, y } = norm(e);
    setDrag({ x0: x, y0: y, x, y });
  };
  const onMove = (e: MouseEvent) => {
    if (!drag) return;
    const { x, y } = norm(e);
    setDrag((d) => (d ? { ...d, x, y } : null));
  };
  const finish = () => {
    if (!drag) return;
    const x0 = Math.min(drag.x0, drag.x);
    const x1 = Math.max(drag.x0, drag.x);
    const y0 = Math.min(drag.y0, drag.y);
    const y1 = Math.max(drag.y0, drag.y);
    setDrag(null);
    const boxSize = Math.max(x1 - x0, y1 - y0);
    if (boxSize < 0.04) return; // ignore a click / tiny drag
    setView((v) => {
      const bcx = (x0 + x1) / 2;
      const bcy = (y0 + y1) / 2;
      const clamp = (n: number) => Math.max(0, Math.min(1, n));
      // Compose with the current view so you can refine an already-zoomed tile.
      return {
        cx: clamp(v.cx + (bcx - 0.5) / v.zoom),
        cy: clamp(v.cy + (bcy - 0.5) / v.zoom),
        zoom: Math.min(8, v.zoom / boxSize),
      };
    });
  };

  const transform =
    `scale(${view.zoom}) ` +
    `translate(${(0.5 - view.cx) * 100}%, ${(0.5 - view.cy) * 100}%)`;

  return (
    <div
      style={{
        width: size,
        border: `2px solid ${color}`,
        borderRadius: 4,
        overflow: "hidden",
        background: "#111",
        position: "relative",
      }}
    >
      {/* The open-field video is square (800 x 800), so a 1:1 tile fits it.
          overflow:hidden so the zoom/pan crops to the tile. */}
      <div
        style={{
          width: size,
          height: size,
          background: "#000",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <video
          ref={setVideoEl}
          src={videoUrl}
          muted
          playsInline
          preload="auto"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform,
            transformOrigin: "center center",
          }}
        />
        {/* Pose overlay. Shares the video's pan/zoom transform so keypoints
            track the frame; the parent loop draws into it each rAF. */}
        <canvas
          ref={setPoseCanvasEl}
          width={size}
          height={size}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            transform,
            transformOrigin: "center center",
            pointerEvents: "none",
          }}
        />
        {/* Drag-to-select-region overlay. */}
        <div
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={finish}
          onMouseLeave={finish}
          onDoubleClick={() => setView(DEFAULT_VIEW)}
          title="Drag to zoom into a region; double-click to reset this tile"
          style={{
            position: "absolute",
            inset: 0,
            cursor: "crosshair",
          }}
        >
          {drag ? (
            <div
              style={{
                position: "absolute",
                left: `${Math.min(drag.x0, drag.x) * 100}%`,
                top: `${Math.min(drag.y0, drag.y) * 100}%`,
                width: `${Math.abs(drag.x - drag.x0) * 100}%`,
                height: `${Math.abs(drag.y - drag.y0) * 100}%`,
                border: "1px dashed #fff",
                background: "rgba(255,255,255,0.15)",
              }}
            />
          ) : null}
        </div>
      </div>
      <div
        ref={setTimeEl}
        style={{
          position: "absolute",
          top: 2,
          left: 3,
          fontSize: 10,
          color: "#fff",
          background: "rgba(0,0,0,0.55)",
          padding: "0 3px",
          borderRadius: 2,
          fontVariantNumeric: "tabular-nums",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 2,
          right: 3,
          width: 18,
          height: 18,
          borderRadius: 3,
          background: color,
          color: "#000",
          fontSize: 13,
          fontWeight: 700,
          lineHeight: "18px",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        {letter}
      </div>
      {/* Position bar on the shared cycle: the full track is the longest clip;
          the lighter region is this clip's window (it ends, then the tile goes
          black); the colored span is the bout; the white line is the shared
          playhead (same x on every tile, so they move together). */}
      <div style={{ position: "relative", height: 5, background: "#1c1c1c" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: `${windowEndFrac * 100}%`,
            background: "#444",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${boutStartFrac * 100}%`,
            width: `${(boutStopFrac - boutStartFrac) * 100}%`,
            background: color,
          }}
        />
        <div
          ref={setPlayheadEl}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: 2,
            background: "#fff",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#ccc",
          padding: "2px 4px",
          background: "#222",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <strong style={{ color: "#fff" }}>{letter}</strong> {subLabel}
      </div>
    </div>
  );
};

export default BoutVideoTile;
