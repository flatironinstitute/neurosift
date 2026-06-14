import { getRedirectUrl } from "@hdf5Interface";
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import getAuthorizationHeaderForUrl from "../../../util/getAuthorizationHeaderForUrl";
import { resolveExternalVideoUrl } from "../../externalVideoUtils";
import {
  checkCompatibility,
  Compatibility,
  drawPoseFrame,
  findSiblingVideoCandidates,
  findVideoCandidates,
  getPoseExtent,
  getVideoTimeRange,
  loadPoseEstimation,
  loadVideoTimestamps,
  PoseData,
  VideoCandidate,
  videoTimeToSessionTime,
} from "./poseEstimationUtils";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
};

type ResolvedVideo = {
  url: string;
  startTime: number;
  endTime: number;
  // Per-frame session timestamps of the video ImageSeries, when present. Used to
  // map the element's playback clock to session time through the real (possibly
  // non-uniform) timing instead of a linear offset. Null falls back to linear.
  timestamps: Float64Array | null;
};

// Shared visual tokens: two text sizes, two muted greys, one hairline color, and
// a faint panel background, to keep the widget reading as one consistent surface.
const FS = { body: 13, small: 11 };
const INK = { muted: "#666", faint: "#999" };
const HAIRLINE = "#e8e8e8";
const PANEL_BG = "#fafafa";

// Small inline spinner for the loading / empty states. The keyframe is injected
// alongside it so it works in the early-return case too (before the main tree).
const Spinner: FunctionComponent<{ label: string; onDark?: boolean }> = ({
  label,
  onDark,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: 18,
      color: onDark ? "#aaa" : INK.muted,
      fontSize: FS.body,
    }}
  >
    <style>{"@keyframes ns-pose-spin{to{transform:rotate(360deg)}}"}</style>
    <span
      style={{
        width: 14,
        height: 14,
        flexShrink: 0,
        borderRadius: "50%",
        border: `2px solid ${onDark ? "#444" : "#ddd"}`,
        borderTopColor: onDark ? "#bbb" : INK.muted,
        animation: "ns-pose-spin 0.8s linear infinite",
        display: "inline-block",
      }}
    />
    {label}
  </div>
);

// Standalone PoseEstimation overlay widget. Keyed on an ndx-pose PoseEstimation
// container: loads its keypoints, lets the user pick which external-file video to
// overlay them on (best name-guess suggested first, always overridable), checks
// time/resolution compatibility (shown as an obvious banner, warn-and-allow), and
// draws the keypoints on a canvas over the video, indexed by the shared session
// clock (no link between pose and video is required).
const PoseEstimationView: FunctionComponent<Props> = ({
  width = 800,
  height = 600,
  nwbUrl,
  path,
}) => {
  const [searchParams] = useSearchParams();

  const [pose, setPose] = useState<PoseData | null>(null);
  const [poseError, setPoseError] = useState<string>();
  const [candidates, setCandidates] = useState<VideoCandidate[]>([]);
  const [selectedVideoPath, setSelectedVideoPath] = useState<string>("");
  const [video, setVideo] = useState<ResolvedVideo | null>(null);
  const [videoError, setVideoError] = useState<string>();
  const [codecError, setCodecError] = useState(false);
  const [videoDims, setVideoDims] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Skeleton edges are off by default (many files define no edges at all).
  const [showEdges, setShowEdges] = useState(false);
  // Manual session-time nudge (seconds) for imprecise / skewed video timing.
  const [offset, setOffset] = useState(0);
  // Cross-file sibling-asset scan state (the pose's videos may live in another
  // asset of the same session, e.g. IBL).
  const [scanning, setScanning] = useState(false);
  // User toggle to view the pose alone (no video) even when a video exists.
  const [forcePoseOnly, setForcePoseOnly] = useState(false);
  // Collapse the left controls panel to give the wide video the full width.
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  // Pose-only playback clock (kept in a ref so the rAF loop does not re-render
  // every frame); the slider mirrors it at ~10 Hz.
  const poseClock = useRef({ t: 0, playing: true, last: 0 });
  const [poseUiTime, setPoseUiTime] = useState(0);
  const [posePlaying, setPosePlaying] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const selectedCandidate = candidates.find(
    (c) => c.path === selectedVideoPath,
  );
  const noPlayableVideo = !selectedCandidate || codecError || !!videoError;
  // Render the pose alone (on a plain canvas with its own clock) when there is no
  // playable video, or when the user forces it. Not while a sibling scan runs.
  const poseOnlyMode = !scanning && (noPlayableVideo || forcePoseOnly);
  const poseExtent = useMemo(() => (pose ? getPoseExtent(pose) : null), [pose]);

  // Load the pose container.
  useEffect(() => {
    let canceled = false;
    setPose(null);
    setPoseError(undefined);
    (async () => {
      try {
        const data = await loadPoseEstimation(nwbUrl, path);
        if (canceled) return;
        if (!data)
          throw new Error("No PoseEstimationSeries found in this container.");
        setPose(data);
      } catch (err) {
        if (!canceled)
          setPoseError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path]);

  // Seed the pose-only clock at the start of the pose span.
  useEffect(() => {
    if (!pose) return;
    poseClock.current.t = pose.timeRange.start;
    setPoseUiTime(pose.timeRange.start);
  }, [pose]);

  // Discover + rank candidate videos once the pose (its original_videos) is known.
  // In-file first; if none, scan sibling assets of the same session (cross-file).
  useEffect(() => {
    if (!pose) return;
    let canceled = false;
    setScanning(false);
    (async () => {
      const poseName = path.split("/").pop() || "";
      const cands = await findVideoCandidates(
        nwbUrl,
        pose.originalVideos,
        poseName,
      );
      if (canceled) return;
      if (cands.length > 0) {
        setCandidates(cands);
        setSelectedVideoPath((prev) => prev || (cands[0]?.path ?? ""));
        return;
      }
      // No video in this file: look in sibling assets of the same session.
      const dandisetId = searchParams.get("dandisetId");
      if (!dandisetId) {
        setCandidates([]);
        return;
      }
      setScanning(true);
      const siblings = await findSiblingVideoCandidates(
        nwbUrl,
        dandisetId,
        searchParams.get("dandisetVersion") || "draft",
        pose.originalVideos,
        poseName,
      );
      if (canceled) return;
      setScanning(false);
      setCandidates(siblings);
      setSelectedVideoPath((prev) => prev || (siblings[0]?.path ?? ""));
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path, pose, searchParams]);

  // Resolve the selected video to a playable URL + its session-time range. The
  // candidate may live in a sibling asset (cross-file), so resolve against its
  // own source file rather than the pose file.
  useEffect(() => {
    if (!selectedVideoPath) return;
    const cand = candidates.find((c) => c.path === selectedVideoPath);
    const srcUrl = cand?.sourceNwbUrl || nwbUrl;
    let canceled = false;
    setVideo(null);
    setVideoError(undefined);
    setCodecError(false);
    setVideoDims(null);
    (async () => {
      try {
        const downloadUrl = await resolveExternalVideoUrl(
          srcUrl,
          selectedVideoPath,
          searchParams.get("dandisetId"),
          searchParams.get("dandisetVersion") || "draft",
        );
        // A native <video> cannot send the DANDI auth header, so for an embargoed
        // asset the /download/ URL 401s. Pre-resolve the presigned S3 URL (with
        // auth) and play that; a no-op for public assets.
        const auth = getAuthorizationHeaderForUrl(downloadUrl);
        const redirected = await getRedirectUrl(
          downloadUrl,
          auth ? { Authorization: auth } : undefined,
        );
        const range = await getVideoTimeRange(srcUrl, selectedVideoPath);
        const timestamps = await loadVideoTimestamps(srcUrl, selectedVideoPath);
        if (canceled) return;
        setVideo({
          url: redirected || downloadUrl,
          startTime: range.startTime,
          endTime: range.endTime,
          timestamps,
        });
      } catch (err) {
        if (!canceled)
          setVideoError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, selectedVideoPath, candidates, searchParams]);

  // Keep the canvas buffer matched to the rendered box so the contain-mapping math
  // is in the same pixel space. The box is present in both video and pose-only
  // modes, so re-measure when either the data or the mode changes.
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pose, video, poseOnlyMode, scanning]);

  // Video-overlay rAF loop: redraw the keypoints at the video's current session
  // time. Runs while playing and paused. Inactive in pose-only mode.
  useEffect(() => {
    if (!pose || !video || poseOnlyMode) return;
    let raf = 0;
    let active = true;
    const loop = () => {
      if (!active) return;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v && c) {
        const sessionTime = videoTimeToSessionTime(
          v.currentTime,
          v.duration,
          video.startTime,
          video.timestamps,
          offset,
        );
        drawPoseFrame(
          c,
          { x0: 0, y0: 0, w: v.videoWidth, h: v.videoHeight },
          pose,
          sessionTime,
          hidden,
          showEdges,
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [pose, video, poseOnlyMode, hidden, showEdges, offset, box]);

  // Pose-only rAF loop: advance an internal clock and draw the keypoints on a
  // plain canvas (no video). Runs only in pose-only mode.
  useEffect(() => {
    if (!pose || !poseExtent || !poseOnlyMode) return;
    let raf = 0;
    let active = true;
    let lastUi = 0;
    poseClock.current.last = performance.now();
    const loop = (now: number) => {
      if (!active) return;
      const clk = poseClock.current;
      const dt = (now - clk.last) / 1000;
      clk.last = now;
      if (clk.playing) {
        clk.t += dt;
        if (clk.t > pose.timeRange.end) clk.t = pose.timeRange.start;
      }
      const c = canvasRef.current;
      if (c) drawPoseFrame(c, poseExtent, pose, clk.t, hidden, showEdges);
      if (now - lastUi > 100) {
        lastUi = now;
        setPoseUiTime(clk.t);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [pose, poseExtent, poseOnlyMode, hidden, showEdges, box]);

  const compatibility: Compatibility | null = useMemo(() => {
    if (!pose || !video) return null;
    return checkCompatibility(
      pose,
      { startTime: video.startTime, endTime: video.endTime },
      videoDims,
    );
  }, [pose, video, videoDims]);

  if (poseError) {
    return (
      <div style={{ padding: 20, color: "#a33" }}>
        Unable to render PoseEstimation: {poseError}
      </div>
    );
  }
  if (!pose) return <Spinner label="Loading pose data..." />;

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
      }}
    >
      <style>
        {".ns-pose-btn{padding:3px 10px;border:1px solid #d4d4d4;border-radius:5px;background:#fff;color:#333;font-size:13px;cursor:pointer}" +
          ".ns-pose-btn:hover{background:#f0f0f0;border-color:#bcbcbc}" +
          ".ns-pose-btn:disabled{color:#aaa;background:#f7f7f7;cursor:default}"}
      </style>
      {/* Left controls panel (collapsible; gives the wide video its height back). */}
      {!panelCollapsed && (
        <div
          style={{
            width: 260,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${HAIRLINE}`,
            background: PANEL_BG,
            overflow: "hidden",
          }}
        >
          {/* Panel header: identity + collapse toggle. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "6px 10px",
              borderBottom: `1px solid ${HAIRLINE}`,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                title={path.split("/").pop()}
                style={{
                  fontWeight: 600,
                  fontSize: FS.body,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {path.split("/").pop()}
              </div>
              <div style={{ color: INK.muted, fontSize: FS.small }}>
                {pose.keypoints.length} keypoints
              </div>
            </div>
            <button
              className="ns-pose-btn"
              onClick={() => setPanelCollapsed(true)}
              title="Hide the controls panel"
              style={{ flexShrink: 0 }}
            >
              Hide Menu
            </button>
          </div>

          {/* Panel body: scrolls when the keypoint list is long. */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 10,
              fontSize: 13,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>Video</span>
              <select
                value={selectedVideoPath}
                onChange={(e) => setSelectedVideoPath(e.target.value)}
                disabled={scanning}
              >
                {candidates.length === 0 && (
                  <option value="">
                    {scanning
                      ? "(searching other files...)"
                      : "(no videos found)"}
                  </option>
                )}
                {candidates.map((c, index) => (
                  <option key={c.path} value={c.path}>
                    {index === 0 && c.score > 0 ? "[suggested] " : ""}
                    {c.name}
                    {c.externalBasename ? ` (${c.externalBasename})` : ""}
                    {c.sourceLabel ? ` - from ${c.sourceLabel}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {selectedCandidate?.sourceLabel && (
              <span
                style={{ color: "#8a5a00", fontSize: FS.small }}
                title="This video is in a different asset than the pose (same session)."
              >
                cross-file: {selectedCandidate.sourceLabel}
              </span>
            )}
            <label
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
              title={
                video?.timestamps
                  ? "Aligned through the video's per-frame timestamps. Nudge if the keypoints lead/lag the animal."
                  : "This video has no per-frame timestamps; alignment is linear. Nudge to correct a constant shift."
              }
            >
              <span>offset (s)</span>
              <input
                type="number"
                step={0.1}
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value) || 0)}
                style={{ width: 80 }}
              />
            </label>
            <span style={{ color: INK.faint, fontSize: FS.small }}>
              {!poseOnlyMode && video
                ? video.timestamps
                  ? "timestamp-aligned"
                  : "linear-aligned (no video timestamps)"
                : ""}
            </span>
            {selectedCandidate && !codecError && !videoError && (
              <button
                className="ns-pose-btn"
                onClick={() => setForcePoseOnly((v) => !v)}
                title="Switch between the video overlay and the pose drawn on its own"
                style={{ alignSelf: "flex-start" }}
              >
                {forcePoseOnly ? "Show video" : "Pose only"}
              </button>
            )}

            {/* Keypoint legend / visibility toggles (vertical list, scrolls). */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                borderTop: `1px solid ${HAIRLINE}`,
                paddingTop: 8,
              }}
            >
              <span style={{ color: INK.muted, fontSize: FS.small }}>
                Keypoints
              </span>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: pose.edges.length === 0 ? INK.faint : undefined,
                }}
                title={
                  pose.edges.length === 0
                    ? "This file defines no skeleton edges"
                    : "Connect keypoints with the skeleton edges"
                }
              >
                <input
                  type="checkbox"
                  checked={showEdges}
                  disabled={pose.edges.length === 0}
                  onChange={(e) => setShowEdges(e.target.checked)}
                />
                Skeleton{pose.edges.length > 0 ? ` (${pose.edges.length})` : ""}
              </label>
              {pose.keypoints.map((kp) => {
                const off = hidden.has(kp.name);
                return (
                  <button
                    key={kp.name}
                    onClick={() =>
                      setHidden((prev) => {
                        const next = new Set(prev);
                        if (next.has(kp.name)) next.delete(kp.name);
                        else next.add(kp.name);
                        return next;
                      })
                    }
                    title="Toggle this keypoint"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "2px 7px",
                      border: `1px solid ${HAIRLINE}`,
                      borderRadius: 6,
                      background: off ? "#f4f4f4" : "#fff",
                      color: off ? INK.faint : "#333",
                      cursor: "pointer",
                      fontSize: FS.small,
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: off ? "#ccc" : kp.color,
                        border: "1px solid #0003",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {kp.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Right stage: banners, video/canvas overlay, transport. */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {panelCollapsed && (
          <div
            style={{
              padding: "4px 8px",
              borderBottom: `1px solid ${HAIRLINE}`,
            }}
          >
            <button
              className="ns-pose-btn"
              onClick={() => setPanelCollapsed(false)}
              title="Show the controls panel"
            >
              Show Menu
            </button>
          </div>
        )}

        {/* Compatibility banner: obvious, warn-and-allow (colored background
            separates it; no divider needed). */}
        {compatibility && (
          <div
            style={{
              padding: "6px 10px",
              fontSize: FS.body,
              background: compatibility.aligned ? "#eef8ee" : "#fff4e5",
              color: compatibility.aligned ? "#256029" : "#8a5a00",
            }}
          >
            <strong>{compatibility.headline}.</strong> {compatibility.detail}
          </div>
        )}

        {/* Pose-only notice (codec / no-video reason), above the canvas. */}
        {poseOnlyMode && (
          <div
            style={{
              padding: "6px 10px",
              fontSize: FS.body,
              background: "#eef2f8",
              color: "#33506e",
            }}
          >
            {codecError
              ? "Video could not be played (codec unsupported), showing the pose on its own."
              : videoError
                ? `Video could not be resolved (${videoError}), showing the pose on its own.`
                : !selectedCandidate
                  ? "No video found for this pose (here or in sibling files of the session), showing the pose on its own."
                  : "Pose-only view (video hidden)."}
          </div>
        )}

        {/* Main area: video overlay, pose-only canvas, or a status message. */}
        <div
          ref={boxRef}
          style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            background: "#111",
          }}
        >
          {scanning ? (
            <Spinner
              onDark
              label="Searching other files in this session for a video..."
            />
          ) : poseOnlyMode ? (
            <canvas
              ref={canvasRef}
              width={box.w}
              height={box.h}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            />
          ) : !video ? (
            <Spinner onDark label="Resolving video..." />
          ) : (
            <>
              <video
                ref={videoRef}
                src={video.url}
                controls
                muted
                playsInline
                onError={() => setCodecError(true)}
                onLoadedMetadata={(e) =>
                  setVideoDims({
                    width: e.currentTarget.videoWidth,
                    height: e.currentTarget.videoHeight,
                  })
                }
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
              <canvas
                ref={canvasRef}
                width={box.w}
                height={box.h}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              />
            </>
          )}
        </div>

        {/* Pose-only transport: play/pause + scrub over the pose time span. */}
        {poseOnlyMode && pose.keypoints.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "5px 10px",
              borderTop: `1px solid ${HAIRLINE}`,
              fontSize: FS.body,
            }}
          >
            <button
              className="ns-pose-btn"
              onClick={() => {
                poseClock.current.playing = !poseClock.current.playing;
                setPosePlaying(poseClock.current.playing);
              }}
            >
              {posePlaying ? "Pause" : "Play"}
            </button>
            <input
              type="range"
              min={pose.timeRange.start}
              max={pose.timeRange.end}
              step={(pose.timeRange.end - pose.timeRange.start) / 2000 || 0.01}
              value={poseUiTime}
              onChange={(e) => {
                const t = Number(e.target.value);
                poseClock.current.t = t;
                setPoseUiTime(t);
              }}
              style={{ flex: 1 }}
            />
            <span
              style={{
                color: INK.muted,
                fontSize: FS.small,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {poseUiTime.toFixed(1)} / {pose.timeRange.end.toFixed(1)} s
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoseEstimationView;
