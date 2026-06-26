import { FunctionComponent, MouseEvent, useEffect, useState } from "react";

type ViewBox = { cx: number; cy: number; zoom: number };
const DEFAULT_VIEW: ViewBox = { cx: 0.5, cy: 0.5, zoom: 1 };

type Props = {
  size: number;
  letter: string;
  subLabel: string;
  color: string;
  // Prominent value readout (the primary feature column), present only when a
  // value column is selected: the column name and the bout's formatted value.
  // Color is deliberately not used here (it stays reserved for behavior identity).
  featureName?: string;
  featureValueText?: string;
  // When false, this is a pose-only tile (no video element; pose draws on black).
  hasVideo: boolean;
  videoUrl?: string;
  // Bumping this resets this tile's pan/zoom (the "Reset zoom" button).
  resetSignal: number;
  // Position-bar geometry on the shared cycle (= the longest clip).
  windowEndFrac: number;
  boutStartFrac: number;
  boutStopFrac: number;
  // Callback refs: the parent's shared loop drives the video, the time overlay,
  // the playhead, and the pose overlay canvas.
  setVideoEl: (el: HTMLVideoElement | null) => void;
  setTimeEl: (el: HTMLDivElement | null) => void;
  setPlayheadEl: (el: HTMLDivElement | null) => void;
  setPoseCanvasEl: (el: HTMLCanvasElement | null) => void;
};

// One montage tile: a square video (or black canvas for pose-only) with the pose
// overlay on top, a letter badge, a live session-time overlay, and a position bar
// showing the bout extent within the shared cycle. Drag a box to zoom into a
// region; double-click to reset. The zoom is a CSS transform applied to both the
// video and the pose canvas so the keypoints stay registered to the frame.
const BoutMontageTile: FunctionComponent<Props> = ({
  size,
  letter,
  subLabel,
  color,
  featureName,
  featureValueText,
  hasVideo,
  videoUrl,
  resetSignal,
  windowEndFrac,
  boutStartFrac,
  boutStopFrac,
  setVideoEl,
  setTimeEl,
  setPlayheadEl,
  setPoseCanvasEl,
}) => {
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
      <div
        style={{
          width: size,
          height: size,
          background: "#000",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {hasVideo && (
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
        )}
        {/* Pose overlay. Shares the tile's pan/zoom transform so keypoints track
            the frame; the parent loop draws into it each rAF. */}
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
          style={{ position: "absolute", inset: 0, cursor: "crosshair" }}
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
        {/* Feature readout (active sort column): name + value + a magnitude bar
            gauge. No color, the gauge length carries the magnitude. Sits over the
            frame bottom and ignores pointer events so it never blocks dragging. */}
        {featureName && (
          <div
            style={{
              position: "absolute",
              left: 5,
              right: 5,
              bottom: 4,
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: "#fff",
                  textShadow: "0 1px 3px rgba(0,0,0,0.95)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {featureValueText ?? "—"}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.9)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.95)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {featureName}
              </span>
            </div>
          </div>
        )}
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

export default BoutMontageTile;
