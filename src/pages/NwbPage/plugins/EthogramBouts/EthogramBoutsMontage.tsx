import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import {
  drawPoseFrame,
  PoseData,
  SourceRect,
} from "../PoseEstimation/poseEstimationUtils";
import { Bout, formatTime } from "./ethogramBoutsUtils";
import BoutMontageTile from "./BoutMontageTile";

const GAP = 4;
const LABEL_H = 30;
const PAD = 8;
const MIN_TILE = 80;
const TOL = 0.34;

export type DisplayedClip = {
  bout: Bout;
  label: string;
  // The primary value column's value for this bout, pre-formatted (shown big on
  // the tile). Set only when at least one value column is selected.
  featureValueText?: string;
};

type Props = {
  hasVideo: boolean;
  videoUrl?: string;
  // Session time of the video's first frame (so session<->video time maps).
  videoStartTime: number;
  poseData: PoseData | null;
  // Drawing area for pose-only tiles (declared dimensions or keypoint bbox).
  poseSrcExtent: SourceRect | null;
  displayedClips: DisplayedClip[];
  color: string;
  // The active sort column's name, shown on each tile next to its value+gauge.
  featureName?: string;
  // Pose/video alignment: the video is seeked `offsetSec` later than the bout's
  // (label-clock) time, and the pose is drawn at the video time minus the offset.
  // 0 for well-formed EthogramBouts files; the VAME adapter passes ~0.5 s.
  offsetSec?: number;
  padSec: number;
  playing: boolean;
  showPose: boolean;
  showEdges: boolean;
  // Trajectory trails: each keypoint's recent path over the last trailSec seconds.
  showTrails: boolean;
  trailSec: number;
  // Bumping this resets every tile's pan/zoom.
  resetSignal: number;
  cols: number;
};

// The per-behavior montage grid. Plays each displayed bout as a clip, all driven
// by ONE shared loop so they restart in sync (cycle = longest clip). On video
// tiles it seeks each <video>; on pose-only tiles it advances a virtual clock.
// Either way it draws the pose for the current session time with the
// pose-estimation widget's renderer (skeleton edges, confidence-ready).
const EthogramBoutsMontage: FunctionComponent<Props> = ({
  hasVideo,
  videoUrl,
  videoStartTime,
  poseData,
  poseSrcExtent,
  displayedClips,
  color,
  featureName,
  offsetSec = 0,
  padSec,
  playing,
  showPose,
  showEdges,
  showTrails,
  trailSec,
  resetSignal,
  cols,
}) => {
  const videoEls = useRef<(HTMLVideoElement | null)[]>([]);
  const timeEls = useRef<(HTMLDivElement | null)[]>([]);
  const playheadEls = useRef<(HTMLDivElement | null)[]>([]);
  const poseCanvasEls = useRef<(HTMLCanvasElement | null)[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Each clip's padded [start, stop] window in SESSION seconds, plus position-bar
  // fractions on the shared cycle (= the longest clip).
  const windows = useMemo(() => {
    const raw = displayedClips.map(({ bout }) => {
      const start = Math.max(0, bout.startTime - padSec);
      const stop = Math.max(bout.stopTime + padSec, start + 0.1);
      return {
        start,
        stop,
        boutStart: bout.startTime,
        boutStop: bout.stopTime,
        len: stop - start,
      };
    });
    const cycleLen = Math.max(0.1, ...raw.map((r) => r.len));
    return raw.map((r) => ({
      start: r.start,
      stop: r.stop,
      len: r.len,
      windowEndFrac: r.len / cycleLen,
      boutStartFrac: (r.boutStart - r.start) / cycleLen,
      boutStopFrac: (r.boutStop - r.start) / cycleLen,
    }));
  }, [displayedClips, padSec]);

  const drawOpts = useMemo(
    () => ({
      hidden: new Set<string>(),
      showEdges,
      showTrails,
      trailSec,
      confThreshold: 0,
      fadeByConfidence: false,
    }),
    [showEdges, showTrails, trailSec],
  );

  // The single shared loop.
  useEffect(() => {
    if (windows.length === 0) return;
    if (hasVideo && !videoUrl) return;
    const drawPose = (i: number, sessionTime: number) => {
      const canvas = poseCanvasEls.current[i];
      if (!canvas) return;
      if (!poseData || !showPose) {
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      const v = videoEls.current[i];
      let src: SourceRect | null = poseSrcExtent;
      if (hasVideo && v && v.videoWidth && v.videoHeight) {
        // Pose coords are in the pose's own pixel space (pose.dimensions =
        // [height, width]); rescale by that when present and aspect-compatible
        // with the video, else fall back to the video's intrinsic size. Same
        // logic as the standalone PoseEstimation overlay.
        src = { x0: 0, y0: 0, w: v.videoWidth, h: v.videoHeight };
        const poseDim = poseData.dimensions[0];
        if (poseDim && poseDim[0] > 0 && poseDim[1] > 0) {
          const poseAspect = poseDim[1] / poseDim[0];
          const videoAspect = v.videoWidth / v.videoHeight;
          if (Math.abs(poseAspect - videoAspect) / videoAspect < 0.02) {
            src = { x0: 0, y0: 0, w: poseDim[1], h: poseDim[0] };
          }
        }
      }
      if (!src) return;
      drawPoseFrame(canvas, src, poseData, sessionTime, drawOpts);
    };

    if (!playing) {
      // Freeze: show each clip at the bout start and paint the pose once.
      const id = requestAnimationFrame(() => {
        for (let i = 0; i < windows.length; i++) {
          const w = windows[i];
          const v = videoEls.current[i];
          if (hasVideo && v) {
            v.style.opacity = "1";
            if (!v.paused) v.pause();
            drawPose(i, videoStartTime + v.currentTime - offsetSec);
          } else {
            drawPose(i, w.start);
          }
          const t = timeEls.current[i];
          if (t)
            t.textContent = formatTime(
              hasVideo && v ? videoStartTime + v.currentTime - offsetSec : w.start,
            );
        }
      });
      return () => cancelAnimationFrame(id);
    }

    const cycleLen = Math.max(...windows.map((w) => w.len));
    let cycleStart: number | null = null;
    let rafId = 0;
    let active = true;

    const loop = (now: number) => {
      if (!active) return;
      if (cycleStart === null) cycleStart = now;
      let elapsed = (now - cycleStart) / 1000;
      let reset = false;
      if (elapsed >= cycleLen) {
        cycleStart = now;
        elapsed = 0;
        reset = true;
      }
      for (let i = 0; i < windows.length; i++) {
        const w = windows[i];
        const finished = elapsed >= w.len;
        if (hasVideo) {
          const v = videoEls.current[i];
          if (!v) continue;
          const videoStart = w.start + offsetSec - videoStartTime;
          if (reset) {
            try {
              v.currentTime = videoStart;
            } catch {
              /* not seekable yet */
            }
            if (v.paused) v.play().catch(() => {});
          }
          if (finished) {
            if (!v.paused) v.pause();
            v.style.opacity = "0";
            const c = poseCanvasEls.current[i];
            if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
          } else {
            v.style.opacity = "1";
            if (v.paused) v.play().catch(() => {});
            const target = videoStart + elapsed;
            if (Math.abs(v.currentTime - target) > TOL) {
              try {
                v.currentTime = target;
              } catch {
                /* ignore */
              }
            }
            drawPose(i, videoStartTime + v.currentTime);
          }
          const t = timeEls.current[i];
          if (t) t.textContent = formatTime(videoStartTime + v.currentTime);
        } else {
          // Pose-only: virtual clock.
          const sessionTime = w.start + Math.min(elapsed, w.len);
          if (finished) {
            const c = poseCanvasEls.current[i];
            if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
          } else {
            drawPose(i, sessionTime);
          }
          const t = timeEls.current[i];
          if (t) t.textContent = formatTime(sessionTime);
        }
        const ph = playheadEls.current[i];
        if (ph) {
          const phase = Math.max(0, Math.min(1, elapsed / cycleLen));
          ph.style.left = `${phase * 100}%`;
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [
    hasVideo,
    videoUrl,
    windows,
    videoStartTime,
    playing,
    poseData,
    poseSrcExtent,
    showPose,
    drawOpts,
    offsetSec,
  ]);

  const rows = Math.ceil(Math.max(1, displayedClips.length) / cols);
  const sideFromWidth = (box.w - PAD * 2 - GAP * (cols - 1)) / cols;
  const sideFromHeight = (box.h - PAD * 2 - GAP * (rows - 1)) / rows - LABEL_H;
  const size = Math.max(
    MIN_TILE,
    Math.floor(Math.min(sideFromWidth, sideFromHeight)),
  );

  let content;
  if (displayedClips.length === 0) {
    content = (
      <div style={{ padding: 12, color: "#666" }}>
        Select a behavior to watch example clips.
      </div>
    );
  } else if (hasVideo && !videoUrl) {
    content = <div style={{ padding: 12 }}>Resolving behavioral video...</div>;
  } else {
    content = (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${size}px)`,
          gap: GAP,
          padding: PAD,
          justifyContent: "center",
          alignContent: "start",
        }}
      >
        {displayedClips.map(
          ({ bout, label, featureValueText }, index) => (
            <BoutMontageTile
              key={`${bout.labelId}-${bout.startTime}-${index}`}
              size={size}
              letter={label}
              subLabel={`@ ${formatTime(bout.startTime)} (${(
                bout.stopTime - bout.startTime
              ).toFixed(1)}s)`}
              color={color}
              featureName={featureName}
              featureValueText={featureValueText}
              hasVideo={hasVideo}
            videoUrl={videoUrl}
            resetSignal={resetSignal}
            windowEndFrac={windows[index].windowEndFrac}
            boutStartFrac={windows[index].boutStartFrac}
            boutStopFrac={windows[index].boutStopFrac}
            setVideoEl={(el) => {
              videoEls.current[index] = el;
            }}
            setTimeEl={(el) => {
              timeEls.current[index] = el;
            }}
            setPlayheadEl={(el) => {
              playheadEls.current[index] = el;
            }}
              setPoseCanvasEl={(el) => {
                poseCanvasEls.current[index] = el;
              }}
            />
          ),
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "auto" }}
    >
      {content}
    </div>
  );
};

export default EthogramBoutsMontage;
