import { getRedirectUrl } from "@hdf5Interface";
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import getAuthorizationHeaderForUrl from "../../../util/getAuthorizationHeaderForUrl";
import { resolveExternalVideoUrl } from "../../externalVideoUtils";
import BoutVideoTile from "./BoutVideoTile";
import { drawPoseFrame, loadVamePoseData, PoseData } from "./poseUtils";
import { formatTime, MotifBout } from "./vameUtils";

const GAP = 4;
const LABEL_H = 30;
const PAD = 8;
const MIN_TILE = 80;

export type DisplayedClip = {
  bout: MotifBout;
  label: string;
};

type Props = {
  nwbUrl: string;
  videoPath: string;
  // The ndx-vame VAMEProject group; used to find the linked PoseEstimation.
  vameProjectPath: string;
  // The clips to display (bout + letter label), chosen and ordered upstream.
  displayedClips: DisplayedClip[];
  selectedMotif: number | null;
  color: string;
  videoStartTime: number;
  offsetSec: number;
  padSec: number;
  playing: boolean;
  // Pose proof-of-concept: overlay the linked PoseEstimation keypoints.
  showPose: boolean;
  resetSignal: number;
  cols: number;
  dandisetId: string | null;
  dandisetVersion: string;
};

// The per-behavior montage grid. Plays each displayed bout as a clip, all driven
// by ONE shared loop so they restart in sync (cycle = longest clip; each clip
// plays its full bout at true speed; a clip that finishes early goes black; at
// the cycle boundary every clip seeks back to its start together). The same loop
// drives each tile's live session-time overlay and its window playhead.
const MotifMontage: FunctionComponent<Props> = ({
  nwbUrl,
  videoPath,
  vameProjectPath,
  displayedClips,
  selectedMotif,
  color,
  videoStartTime,
  offsetSec,
  padSec,
  playing,
  showPose,
  resetSignal,
  cols,
  dandisetId,
  dandisetVersion,
}) => {
  const [videoUrl, setVideoUrl] = useState<string>();
  const [resolveError, setResolveError] = useState<string>();
  const [poseData, setPoseData] = useState<PoseData | null>(null);

  const videoEls = useRef<(HTMLVideoElement | null)[]>([]);
  const timeEls = useRef<(HTMLDivElement | null)[]>([]);
  const playheadEls = useRef<(HTMLDivElement | null)[]>([]);
  const poseCanvasEls = useRef<(HTMLCanvasElement | null)[]>([]);

  // Load the linked PoseEstimation once per file/project (PoC: whole-array read).
  useEffect(() => {
    let canceled = false;
    setPoseData(null);
    (async () => {
      const data = await loadVamePoseData(nwbUrl, vameProjectPath);
      if (!canceled) setPoseData(data);
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, vameProjectPath]);

  // Measure the actual available area so tiles always fit it exactly.
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

  useEffect(() => {
    let canceled = false;
    setVideoUrl(undefined);
    setResolveError(undefined);
    (async () => {
      try {
        const downloadUrl = await resolveExternalVideoUrl(
          nwbUrl,
          videoPath,
          dandisetId,
          dandisetVersion,
        );
        // A native <video> cannot send the DANDI auth header, so an embargoed
        // asset's /download/ URL 401s. Resolve the presigned S3 URL ourselves
        // (with auth) and play that. For public assets the redirect resolves to
        // the same presigned URL, so this is a no-op cost.
        const auth = getAuthorizationHeaderForUrl(downloadUrl);
        const redirected = await getRedirectUrl(
          downloadUrl,
          auth ? { Authorization: auth } : undefined,
        );
        if (!canceled) setVideoUrl(redirected || downloadUrl);
      } catch (err) {
        if (!canceled) {
          setResolveError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, videoPath, dandisetId, dandisetVersion]);

  // Each clip's padded [start, stop] window in video time. The position-bar
  // fractions are expressed on the SHARED cycle (= the longest clip) so every
  // tile's bar uses the same time scale: a shorter clip's window occupies only
  // the left part of the track (windowEndFrac), and the playhead (shared cycle
  // phase) moves in lockstep across all tiles.
  const windows = useMemo(() => {
    const raw = displayedClips.map(({ bout }) => {
      const boutStart = bout.startTime + offsetSec - videoStartTime;
      const boutStop = bout.stopTime + offsetSec - videoStartTime;
      const start = Math.max(0, boutStart - padSec);
      const stop = Math.max(boutStop + padSec, start + 0.1);
      return { start, stop, boutStart, boutStop, len: stop - start };
    });
    const cycleLen = Math.max(0.1, ...raw.map((r) => r.len));
    return raw.map((r) => ({
      start: r.start,
      stop: r.stop,
      windowEndFrac: r.len / cycleLen,
      boutStartFrac: (r.boutStart - r.start) / cycleLen,
      boutStopFrac: (r.boutStop - r.start) / cycleLen,
    }));
  }, [displayedClips, offsetSec, videoStartTime, padSec]);

  // The single shared loop: keeps all tiles synchronized and updates each tile's
  // session-time overlay and window playhead by writing the DOM directly.
  useEffect(() => {
    if (!videoUrl) return;
    if (windows.length === 0) return;
    // Paused: freeze every clip where it is (all visible) and don't run the loop.
    if (!playing) {
      videoEls.current.forEach((v) => {
        if (!v) return;
        v.style.opacity = "1";
        if (!v.paused) v.pause();
      });
      return;
    }
    const lens = windows.map((w) => w.stop - w.start);
    const cycleLen = Math.max(...lens);
    let cycleStart: number | null = null;
    let rafId = 0;
    let active = true;
    const TOL = 0.34;

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
        const v = videoEls.current[i];
        if (!v) continue;
        const w = windows[i];
        const len = lens[i];
        if (reset) {
          try {
            v.currentTime = w.start;
          } catch {
            /* not seekable yet */
          }
          if (v.paused) v.play().catch(() => {});
        }
        const canvas = poseCanvasEls.current[i];
        const clearPose = () =>
          canvas
            ?.getContext("2d")
            ?.clearRect(0, 0, canvas.width, canvas.height);
        if (elapsed >= len) {
          // Finished its window: go black (hide the frame) until the shared
          // cycle resets and every clip replays together.
          if (!v.paused) v.pause();
          v.style.opacity = "0";
          clearPose();
        } else {
          v.style.opacity = "1";
          if (v.paused) v.play().catch(() => {});
          const target = w.start + elapsed;
          if (Math.abs(v.currentTime - target) > TOL) {
            try {
              v.currentTime = target;
            } catch {
              /* ignore */
            }
          }
          if (canvas) {
            if (poseData && showPose) {
              drawPoseFrame(
                canvas,
                v,
                poseData,
                videoStartTime + v.currentTime,
              );
            } else {
              clearPose();
            }
          }
        }
        const t = timeEls.current[i];
        if (t) {
          t.textContent = formatTime(
            v.currentTime - offsetSec + videoStartTime,
          );
        }
        const ph = playheadEls.current[i];
        if (ph) {
          // Shared cycle phase: identical x on every tile, so the playheads move
          // in lockstep regardless of each clip's length.
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
    videoUrl,
    windows,
    offsetSec,
    videoStartTime,
    playing,
    poseData,
    showPose,
  ]);

  // When paused, the shared loop is idle. Paint (or clear) the pose overlay once
  // so keypoints sit on the frozen frame and the toggle still takes effect. The
  // rAF lets a just-seeked frame settle before reading currentTime.
  useEffect(() => {
    if (playing) return;
    const rafId = requestAnimationFrame(() => {
      videoEls.current.forEach((v, i) => {
        const canvas = poseCanvasEls.current[i];
        if (!v || !canvas) return;
        if (poseData && showPose) {
          drawPoseFrame(canvas, v, poseData, videoStartTime + v.currentTime);
        } else {
          canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [playing, poseData, showPose, videoStartTime, videoUrl, windows]);

  // Size each square tile so the whole grid fits the measured area (so the bottom
  // row is never clipped by the ethogram regardless of the controls bar height).
  const rows = Math.ceil(Math.max(1, displayedClips.length) / cols);
  const sideFromWidth = (box.w - PAD * 2 - GAP * (cols - 1)) / cols;
  const sideFromHeight = (box.h - PAD * 2 - GAP * (rows - 1)) / rows - LABEL_H;
  const size = Math.max(
    MIN_TILE,
    Math.floor(Math.min(sideFromWidth, sideFromHeight)),
  );

  let content;
  if (selectedMotif === null) {
    content = (
      <div style={{ padding: 12, color: "#666" }}>
        Select a motif from the list to watch example clips.
      </div>
    );
  } else if (resolveError) {
    content = (
      <div style={{ padding: 12, color: "#6b5a2e" }}>
        Could not resolve the behavioral video: {resolveError}
      </div>
    );
  } else if (!videoUrl) {
    content = <div style={{ padding: 12 }}>Resolving behavioral video...</div>;
  } else if (displayedClips.length === 0) {
    content = (
      <div style={{ padding: 12, color: "#666" }}>
        No bouts of motif {selectedMotif} pass the current minimum-length
        filter.
      </div>
    );
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
        {displayedClips.map(({ bout, label }, index) => {
          const w = windows[index];
          return (
            <BoutVideoTile
              key={`${bout.startFrame}`}
              videoUrl={videoUrl}
              size={size}
              letter={label}
              subLabel={`@ ${formatTime(bout.startTime)} (${(
                bout.stopTime - bout.startTime
              ).toFixed(1)}s)`}
              color={color}
              resetSignal={resetSignal}
              windowEndFrac={w.windowEndFrac}
              boutStartFrac={w.boutStartFrac}
              boutStopFrac={w.boutStopFrac}
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
          );
        })}
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

export default MotifMontage;
