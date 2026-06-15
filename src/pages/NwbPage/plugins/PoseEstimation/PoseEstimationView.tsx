import { getRedirectUrl } from "@hdf5Interface";
import {
  CSSProperties,
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import getAuthorizationHeaderForUrl from "../../../util/getAuthorizationHeaderForUrl";
import { resolveExternalVideoUrl } from "../../externalVideoUtils";
import {
  drawPoseFrame,
  findSiblingVideoCandidates,
  findVideoCandidates,
  getPoseExtent,
  getVideoTimeRange,
  loadConfidence,
  loadPoseEstimation,
  loadVideoTimestamps,
  PoseData,
  sessionTimeToVideoTime,
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
// Leading-window first paint: rows loaded up front so the overlay renders fast;
// the full coordinate arrays then stream in the background and swap in.
const LEADING_FRAMES = 6000;

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
  const [searchParams, setSearchParams] = useSearchParams();
  // Extract the DANDI identifiers as stable strings. Effects key off these rather
  // than the whole `searchParams` object, so writing `pose*` params (which mutates
  // searchParams) does not re-trigger candidate discovery or video resolution.
  const dandisetId = searchParams.get("dandisetId");
  const dandisetVersion = searchParams.get("dandisetVersion") || "draft";

  const [pose, setPose] = useState<PoseData | null>(null);
  const [poseError, setPoseError] = useState<string>();
  const [candidates, setCandidates] = useState<VideoCandidate[]>([]);
  const [selectedVideoPath, setSelectedVideoPath] = useState<string>("");
  const [video, setVideo] = useState<ResolvedVideo | null>(null);
  const [videoError, setVideoError] = useState<string>();
  const [codecError, setCodecError] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Skeleton edges are off by default (many files define no edges at all).
  const [showEdges, setShowEdges] = useState(false);
  // Trajectory trails (recent path of each keypoint) are off by default.
  const [showTrails, setShowTrails] = useState(false);
  // How far back (seconds) a trail reaches.
  const [trailSec, setTrailSec] = useState(1.0);
  // Hide keypoints whose confidence is below this (0 = show all).
  const [confThreshold, setConfThreshold] = useState(0);
  // Fade shown keypoints by their confidence (off by default).
  const [fadeByConfidence, setFadeByConfidence] = useState(false);
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
  const poseClock = useRef({ t: 0, playing: false, last: 0 });
  const [poseUiTime, setPoseUiTime] = useState(0);
  const [posePlaying, setPosePlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Shared timeline (multi-view): the widget both pushes its current session time
  // to the shared clock and follows external scrubs of it. The push throttle and a
  // follow-tolerance (bigger than the push lag) together avoid a feedback loop, the
  // same drift-band idea as the multi-video tab.
  const { currentTime, setCurrentTime, initializeTimeseriesSelection } =
    useTimeseriesSelection();
  const currentTimeRef = useRef<number | undefined>(undefined);
  currentTimeRef.current = currentTime;
  const lastPushRef = useRef(0);
  const SHARED_PUSH_MS = 100;
  const SHARED_FOLLOW_TOL = 0.3;

  const selectedCandidate = candidates.find(
    (c) => c.path === selectedVideoPath,
  );
  const noPlayableVideo = !selectedCandidate || codecError || !!videoError;
  // Render the pose alone (on a plain canvas with its own clock) when there is no
  // playable video, or when the user forces it. Not while a sibling scan runs.
  const poseOnlyMode = !scanning && (noPlayableVideo || forcePoseOnly);
  const poseExtent = useMemo(() => (pose ? getPoseExtent(pose) : null), [pose]);

  // Group discovered videos by their source file for the two-step picker (source
  // file -> its videos). "(none)" = pose only is the first source option.
  const sources: { key: string; label: string; videos: VideoCandidate[] }[] =
    [];
  for (const c of candidates) {
    const key = c.sourceNwbUrl || "__this__";
    let s = sources.find((x) => x.key === key);
    if (!s) {
      s = { key, label: c.sourceLabel || "(this file)", videos: [] };
      sources.push(s);
    }
    s.videos.push(c);
  }
  const selectedSource = forcePoseOnly
    ? undefined
    : selectedCandidate
      ? sources.find(
          (s) => s.key === (selectedCandidate.sourceNwbUrl || "__this__"),
        )
      : sources[0];
  const selectedSourceKey = forcePoseOnly
    ? "__none__"
    : (selectedSource?.key ?? "__none__");

  // --- URL persistence (static view state). See url_react_router.md for the
  // param schema and write-timing rules; poseTime is handled separately.
  // Keypoint series names share a long common prefix (e.g. "PoseEstimationSeries");
  // strip it for the URL value, shorter and still a stable per-file id.
  const namePrefix = useMemo(() => {
    const names = pose?.keypoints.map((k) => k.name) ?? [];
    if (names.length < 2) return "";
    let pfx = names[0];
    for (const n of names) {
      while (pfx && !n.startsWith(pfx)) pfx = pfx.slice(0, -1);
      if (!pfx) break;
    }
    return pfx;
  }, [pose]);
  const shortName = useCallback(
    (n: string) =>
      namePrefix && n.startsWith(namePrefix) ? n.slice(namePrefix.length) : n,
    [namePrefix],
  );

  const [hydrated, setHydrated] = useState(false);
  const videoHydratedRef = useRef(false);

  // Hydrate static view state from the URL once the pose (hence keypoint names)
  // is known. Flipping `hydrated` gates the writer so it cannot clobber the
  // incoming params before they are applied.
  useEffect(() => {
    if (!pose || hydrated) return;
    const g = (k: string) => searchParams.get(k);
    const off = g("poseOffset");
    if (off !== null) setOffset(Number(off) || 0);
    if (g("poseEdges") === "1") setShowEdges(true);
    if (g("poseOnly") === "1") setForcePoseOnly(true);
    const conf = g("poseConf");
    if (conf !== null) setConfThreshold(Number(conf) || 0);
    if (g("poseFade") === "1") setFadeByConfidence(true);
    if (g("poseTrails") === "1") setShowTrails(true);
    const tw = g("poseTrailSec");
    if (tw !== null) setTrailSec(Number(tw) || 1.0);
    const hid = g("poseHidden");
    if (hid) {
      const want = new Set(hid.split(",").filter(Boolean));
      const full = pose.keypoints
        .map((k) => k.name)
        .filter((n) => want.has(shortName(n)));
      if (full.length) setHidden(new Set(full));
    }
    setHydrated(true);
  }, [pose, hydrated, searchParams, shortName]);

  // Apply the selected video from the URL once candidates are discovered (incl.
  // the cross-file sibling scan), matched by series name (+ source asset id).
  useEffect(() => {
    if (videoHydratedRef.current || candidates.length === 0) return;
    const wantName = searchParams.get("poseVideo");
    const wantSrc = searchParams.get("poseVideoSource");
    if (wantName) {
      const m = candidates.find(
        (c) =>
          c.name === wantName &&
          (!wantSrc || (c.sourceNwbUrl || "").includes(wantSrc)),
      );
      if (m) setSelectedVideoPath(m.path);
    }
    videoHydratedRef.current = true;
  }, [candidates, searchParams]);

  // Write static view state to the URL live (replace, defaults omitted). poseVideo
  // is written only after the video has been applied, so the incoming param is
  // not wiped before it is read.
  useEffect(() => {
    if (!hydrated) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const setDel = (k: string, v: string | null) =>
          v ? next.set(k, v) : next.delete(k);
        setDel("poseOffset", offset !== 0 ? String(offset) : null);
        setDel(
          "poseHidden",
          hidden.size ? [...hidden].map(shortName).sort().join(",") : null,
        );
        setDel("poseEdges", showEdges ? "1" : null);
        setDel("poseOnly", forcePoseOnly ? "1" : null);
        setDel("poseConf", confThreshold > 0 ? String(confThreshold) : null);
        setDel("poseFade", fadeByConfidence ? "1" : null);
        setDel("poseTrails", showTrails ? "1" : null);
        setDel("poseTrailSec", trailSec !== 1.0 ? String(trailSec) : null);
        if (videoHydratedRef.current) {
          const cand = candidates.find((c) => c.path === selectedVideoPath);
          const suggested = candidates[0];
          const isSuggested =
            !!cand && !!suggested && cand.path === suggested.path;
          setDel("poseVideo", cand && !isSuggested ? cand.name : null);
          const m = cand?.sourceNwbUrl?.match(/\/assets\/([0-9a-fA-F-]{36})\//);
          setDel("poseVideoSource", m ? m[1] : null);
        }
        return next;
      },
      { replace: true },
    );
  }, [
    hydrated,
    offset,
    hidden,
    showEdges,
    forcePoseOnly,
    confThreshold,
    fadeByConfidence,
    showTrails,
    trailSec,
    selectedVideoPath,
    candidates,
    shortName,
    setSearchParams,
  ]);

  // poseTime: written on pause/seek (never live), cleared on play; the loader
  // accepts any value and seeds it paused (see url_react_router.md).
  const writePoseTime = useCallback(
    (t: number | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (t === null || !Number.isFinite(t)) next.delete("poseTime");
          else next.set("poseTime", t.toFixed(3));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const videoSeededRef = useRef(false);

  // True while the full-resolution coordinates are still streaming in the
  // background after the leading window has painted.
  const [loadingFull, setLoadingFull] = useState(false);
  // Lazy confidence: the per-frame confidence arrays are fetched only when a
  // confidence control is engaged (they are a major share of load time and the
  // default controls do not use them). Cached here so re-merging after a
  // coordinate swap, or re-engaging a control, does not refetch.
  const confMapRef = useRef<Map<string, Float32Array> | null>(null);
  const [loadingConf, setLoadingConf] = useState(false);

  // Load the pose container in two phases: a small leading window first (so the
  // overlay paints in a few seconds), then the full coordinate arrays in the
  // background, swapped in when ready. Small files skip phase 2 (the window
  // already held everything). See the performance note in the design doc.
  useEffect(() => {
    let canceled = false;
    setPose(null);
    setPoseError(undefined);
    setLoadingFull(false);
    confMapRef.current = null; // drop the previous container's confidence cache
    (async () => {
      try {
        const lead = await loadPoseEstimation(nwbUrl, path, {
          leadingFrames: LEADING_FRAMES,
        });
        if (canceled) return;
        if (!lead)
          throw new Error("No PoseEstimationSeries found in this container.");
        setPose(lead);
        const truncated = lead.keypoints.some(
          (kp) => kp.coords.length / 2 < kp.timestamps.length,
        );
        if (!truncated) return; // leading window already covered the whole file
        setLoadingFull(true);
        const full = await loadPoseEstimation(nwbUrl, path);
        if (canceled) return;
        if (full) setPose(full);
        setLoadingFull(false);
      } catch (err) {
        if (!canceled)
          setPoseError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path]);

  // Lazy confidence. Confidence is needed once a control engages it (threshold
  // above 0, fade on, or a poseConf/poseFade deep-link). Two effects keep the
  // fetch and the merge separate so the two-phase coordinate swap cannot cancel
  // and restart the (often expensive) confidence fetch:
  const confNeeded = confThreshold > 0 || fadeByConfidence;
  const canFetchConf = !!pose?.hasConfidence;
  const [confVersion, setConfVersion] = useState(0);

  // Fetch the confidence arrays once per container when first needed. Gated on the
  // boolean `canFetchConf` (steady across the leading->full coordinate swap, which
  // recreates `pose`) rather than `pose` itself, so the swap does not re-run this
  // and abort an in-flight fetch. Cached in confMapRef; the bump triggers merging.
  useEffect(() => {
    if (!canFetchConf || !confNeeded || confMapRef.current) return;
    let canceled = false;
    setLoadingConf(true);
    (async () => {
      try {
        const map = await loadConfidence(nwbUrl, path);
        if (canceled || !map) return;
        confMapRef.current = map;
        setConfVersion((v) => v + 1);
      } finally {
        if (!canceled) setLoadingConf(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [canFetchConf, confNeeded, nwbUrl, path]);

  // Merge cached confidence into the current pose. Re-runs on the coordinate swap
  // (which recreates `pose` with confidence null) so the merge re-applies from the
  // cache without refetching; the guard makes it a no-op once already merged.
  useEffect(() => {
    const map = confMapRef.current;
    if (!pose || !map || pose.keypoints.some((k) => k.confidence)) return;
    setPose((prev) =>
      prev && !prev.keypoints.some((k) => k.confidence)
        ? {
            ...prev,
            keypoints: prev.keypoints.map((kp) => ({
              ...kp,
              confidence: map.get(kp.name) ?? null,
            })),
          }
        : prev,
    );
  }, [pose, confVersion]);

  // Seed the pose-only clock and register the pose span with the shared timeline,
  // ONCE per container. Gating on the container key (not just `pose`) is essential:
  // the two-phase load swaps `pose` when the full coordinates arrive, and without
  // this guard that swap would jump playback back to start. timeRange comes from
  // the full timestamps in both phases, so leading and full agree on it. Initial
  // position: a deep-linked poseTime (clamped) if present, else the span start.
  const clockSeededKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pose) return;
    const key = `${nwbUrl}|${path}`;
    if (clockSeededKeyRef.current === key) return;
    clockSeededKeyRef.current = key;
    const raw = searchParams.get("poseTime");
    const t0 =
      raw !== null && Number.isFinite(Number(raw))
        ? Math.min(
            pose.timeRange.end,
            Math.max(pose.timeRange.start, Number(raw)),
          )
        : pose.timeRange.start;
    poseClock.current.t = t0;
    setPoseUiTime(t0);
    initializeTimeseriesSelection({
      startTimeSec: pose.timeRange.start,
      endTimeSec: pose.timeRange.end,
      initialVisibleStartTimeSec: pose.timeRange.start,
      initialVisibleEndTimeSec: pose.timeRange.end,
    });
  }, [pose, nwbUrl, path, searchParams, initializeTimeseriesSelection]);

  // Discover + rank candidate videos once per container. In-file first; if none,
  // scan sibling assets of the same session. Gated on the steady boolean
  // `poseReady` (and the stable container inputs) rather than `pose` itself: the
  // two-phase load swaps `pose` when the full coordinates arrive, and if this
  // effect depended on `pose` that swap would re-run it -> the cleanup would
  // cancel the in-flight scan and the once-per-container guard would block the
  // restart, so a cross-file video would silently never resolve. originalVideos
  // (identical across both phases) is read from a ref to keep it out of the deps.
  const poseReady = !!pose;
  const originalVideosRef = useRef<string[]>([]);
  if (pose) originalVideosRef.current = pose.originalVideos;
  const discoveredKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!poseReady) return;
    const key = `${nwbUrl}|${path}`;
    if (discoveredKeyRef.current === key) return;
    discoveredKeyRef.current = key;
    let canceled = false;
    setScanning(false);
    (async () => {
      const poseName = path.split("/").pop() || "";
      const originalVideos = originalVideosRef.current;
      const cands = await findVideoCandidates(nwbUrl, originalVideos, poseName);
      if (canceled) return;
      if (cands.length > 0) {
        setCandidates(cands);
        setSelectedVideoPath((prev) => prev || (cands[0]?.path ?? ""));
        return;
      }
      // No video in this file: look in sibling assets of the same session.
      if (!dandisetId) {
        setCandidates([]);
        return;
      }
      setScanning(true);
      const siblings = await findSiblingVideoCandidates(
        nwbUrl,
        dandisetId,
        dandisetVersion,
        originalVideos,
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
  }, [poseReady, nwbUrl, path, dandisetId, dandisetVersion]);

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
    (async () => {
      try {
        const downloadUrl = await resolveExternalVideoUrl(
          srcUrl,
          selectedVideoPath,
          dandisetId,
          dandisetVersion,
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
  }, [nwbUrl, selectedVideoPath, candidates, dandisetId, dandisetVersion]);

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
        // Pose coords live in the pose's own pixel space (pose.dimensions =
        // [height, width]); normalize by that so the overlay tracks even when the
        // displayed video is a different resolution than the one the pose was
        // computed on. Fall back to the video's intrinsic size when dimensions are
        // absent, or when their aspect disagrees with the video (a real crop
        // mismatch / unreliable metadata, where rescaling would misplace the dots).
        let src = { x0: 0, y0: 0, w: v.videoWidth, h: v.videoHeight };
        const poseDim = pose.dimensions[0];
        if (
          poseDim &&
          poseDim[0] > 0 &&
          poseDim[1] > 0 &&
          v.videoWidth > 0 &&
          v.videoHeight > 0
        ) {
          const poseAspect = poseDim[1] / poseDim[0];
          const videoAspect = v.videoWidth / v.videoHeight;
          if (Math.abs(poseAspect - videoAspect) / videoAspect < 0.02) {
            src = { x0: 0, y0: 0, w: poseDim[1], h: poseDim[0] };
          }
        }
        drawPoseFrame(c, src, pose, sessionTime, {
          hidden,
          showEdges,
          showTrails,
          trailSec,
          confThreshold,
          fadeByConfidence,
        });
        // Push our session time to the shared clock (throttled) so other
        // multi-view panels follow. The follow-effect's tolerance ignores these.
        const now = performance.now();
        if (now - lastPushRef.current > SHARED_PUSH_MS) {
          lastPushRef.current = now;
          setCurrentTime(sessionTime);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [
    pose,
    video,
    poseOnlyMode,
    hidden,
    showEdges,
    showTrails,
    trailSec,
    confThreshold,
    fadeByConfidence,
    offset,
    box,
    setCurrentTime,
  ]);

  // Follow the shared clock: when an external view scrubs it far from where our
  // video is, seek the video to match (tolerance absorbs our own pushes).
  useEffect(() => {
    if (poseOnlyMode || !video || currentTime === undefined) return;
    const v = videoRef.current;
    if (!v) return;
    const vSession = videoTimeToSessionTime(
      v.currentTime,
      v.duration,
      video.startTime,
      video.timestamps,
      offset,
    );
    if (Math.abs(currentTime - vSession) > SHARED_FOLLOW_TOL) {
      const target = sessionTimeToVideoTime(
        currentTime,
        v.duration,
        video.startTime,
        video.timestamps,
        offset,
      );
      if (Math.abs(v.currentTime - target) > 0.05) v.currentTime = target;
    }
  }, [currentTime, video, poseOnlyMode, offset]);

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
        // Stop at the end (no loop), matching the native video element.
        if (clk.t >= pose.timeRange.end) {
          clk.t = pose.timeRange.end;
          clk.playing = false;
          setPosePlaying(false);
        }
      }
      const c = canvasRef.current;
      if (c)
        drawPoseFrame(c, poseExtent, pose, clk.t, {
          hidden,
          showEdges,
          showTrails,
          trailSec,
          confThreshold,
          fadeByConfidence,
        });
      if (now - lastUi > 100) {
        lastUi = now;
        setPoseUiTime(clk.t);
        // While playing, lead the shared clock so other panels follow.
        if (clk.playing) setCurrentTime(clk.t);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [
    pose,
    poseExtent,
    poseOnlyMode,
    hidden,
    showEdges,
    showTrails,
    trailSec,
    confThreshold,
    fadeByConfidence,
    box,
    setCurrentTime,
  ]);

  // Follow the shared clock in pose-only mode: when idle (not playing) and an
  // external view scrubs it away from our position, jump to it.
  useEffect(() => {
    if (!poseOnlyMode || currentTime === undefined) return;
    if (poseClock.current.playing) return;
    if (Math.abs(currentTime - poseClock.current.t) > SHARED_FOLLOW_TOL) {
      poseClock.current.t = currentTime;
      setPoseUiTime(currentTime);
    }
  }, [currentTime, poseOnlyMode]);

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
                {loadingFull ? " - loading full resolution..." : ""}
                {loadingConf ? " - loading confidence..." : ""}
              </div>
            </div>
            <IconButton
              size="small"
              onClick={() => setPanelCollapsed(true)}
              title="Collapse panel"
              sx={{ flexShrink: 0 }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
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
            {/* Background video: first pick a source file (or "none" = pose only),
                then a video within it. The pose keypoints are the overlay; the
                video is the background they are drawn on. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: INK.muted, fontSize: FS.small }}>
                Background video
              </span>
              <label
                style={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <span style={{ color: INK.faint, fontSize: FS.small }}>
                  File
                </span>
                <select
                  value={selectedSourceKey}
                  disabled={scanning}
                  onChange={(e) => {
                    const k = e.target.value;
                    if (k === "__none__") {
                      setForcePoseOnly(true);
                      return;
                    }
                    setForcePoseOnly(false);
                    const first = sources.find((s) => s.key === k)?.videos[0];
                    if (first) setSelectedVideoPath(first.path);
                  }}
                >
                  <option value="__none__">(none - pose only)</option>
                  {sources.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                  {sources.length === 0 && (
                    <option value="__empty__" disabled>
                      {scanning
                        ? "(searching other files...)"
                        : "(no videos found)"}
                    </option>
                  )}
                </select>
              </label>
              {selectedSource && (
                <label
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span style={{ color: INK.faint, fontSize: FS.small }}>
                    Video
                  </span>
                  <select
                    value={selectedVideoPath}
                    onChange={(e) => {
                      setForcePoseOnly(false);
                      setSelectedVideoPath(e.target.value);
                    }}
                  >
                    {selectedSource.videos.map((c, index) => (
                      <option key={c.path} value={c.path}>
                        {index === 0 && c.score > 0 ? "[suggested] " : ""}
                        {c.name}
                        {c.externalBasename ? ` (${c.externalBasename})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {/* Video alignment: the offset and how the pose and video spans line
                up on the session clock (both spans share one neutral color). */}
            {selectedCandidate &&
              (() => {
                const v = video;
                const hasV = !!v && v.endTime > v.startTime;
                const vStart =
                  v && v.endTime > v.startTime
                    ? v.startTime
                    : pose.timeRange.start;
                const vEnd =
                  v && v.endTime > v.startTime ? v.endTime : pose.timeRange.end;
                const ovStart = Math.max(pose.timeRange.start, vStart);
                const ovEnd = Math.min(pose.timeRange.end, vEnd);
                const hasOverlap = hasV && ovEnd > ovStart;
                const t0 = Math.min(pose.timeRange.start, vStart);
                const t1 = Math.max(pose.timeRange.end, vEnd);
                const span = t1 - t0 || 1;
                const SPAN_COLOR = "#9aa7b5";
                const rowStyle: CSSProperties = {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                };
                const labelStyle: CSSProperties = {
                  width: 40,
                  fontSize: 10,
                  color: INK.muted,
                  textAlign: "right",
                };
                const trackStyle: CSSProperties = {
                  position: "relative",
                  flex: 1,
                  height: 8,
                  background: HAIRLINE,
                  borderRadius: 3,
                };
                const seg = (a: number, b: number): CSSProperties => ({
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${((a - t0) / span) * 100}%`,
                  width: `${(Math.max(b - a, 0) / span) * 100}%`,
                  minWidth: 2,
                  background: SPAN_COLOR,
                  borderRadius: 3,
                });
                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      borderTop: `1px solid ${HAIRLINE}`,
                      paddingTop: 8,
                    }}
                  >
                    <span style={{ color: INK.muted, fontSize: FS.small }}>
                      Video alignment
                    </span>
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                      title={
                        video?.timestamps
                          ? "Aligned through the video's per-frame timestamps. Nudge if the keypoints lead/lag the animal."
                          : "No per-frame timestamps; alignment is linear. Nudge to correct a constant shift."
                      }
                    >
                      <span style={{ color: INK.muted }}>offset (s)</span>
                      <input
                        type="number"
                        step={0.1}
                        value={offset}
                        onChange={(e) => setOffset(Number(e.target.value) || 0)}
                        style={{ width: 70 }}
                      />
                    </label>
                    <div style={rowStyle}>
                      <span style={labelStyle}>pose</span>
                      <div style={trackStyle}>
                        <div
                          style={seg(pose.timeRange.start, pose.timeRange.end)}
                        />
                      </div>
                    </div>
                    <div style={rowStyle}>
                      <span style={labelStyle}>video</span>
                      <div style={trackStyle}>
                        {hasV && <div style={seg(vStart, vEnd)} />}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        paddingLeft: 46,
                        color: !hasV
                          ? INK.faint
                          : hasOverlap
                            ? "#2e7d32"
                            : "#b26a00",
                      }}
                    >
                      {!hasV
                        ? "video timing unknown"
                        : hasOverlap
                          ? `aligned ${ovStart.toFixed(0)}-${ovEnd.toFixed(0)} s`
                          : "no overlap - pick another video"}
                    </span>
                    <span
                      style={{
                        color: INK.faint,
                        fontSize: 10,
                        paddingLeft: 46,
                      }}
                    >
                      {video
                        ? video.timestamps
                          ? "timestamp-aligned"
                          : "linear-aligned"
                        : ""}
                    </span>
                  </div>
                );
              })()}

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
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="ns-pose-btn"
                  onClick={() => setHidden(new Set())}
                  disabled={hidden.size === 0}
                  title="Show every keypoint"
                  style={{ fontSize: FS.small, padding: "1px 8px" }}
                >
                  Show all
                </button>
                <button
                  className="ns-pose-btn"
                  onClick={() =>
                    setHidden(new Set(pose.keypoints.map((k) => k.name)))
                  }
                  disabled={hidden.size === pose.keypoints.length}
                  title="Hide every keypoint"
                  style={{ fontSize: FS.small, padding: "1px 8px" }}
                >
                  Hide all
                </button>
              </div>
              {/* Compact wrapped chips (alphabetical), not a full-width list. */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
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
                      onDoubleClick={() =>
                        setHidden((prev) => {
                          const all = pose.keypoints.map((k) => k.name);
                          const isolated =
                            prev.size === all.length - 1 && !prev.has(kp.name);
                          return isolated
                            ? new Set()
                            : new Set(all.filter((n) => n !== kp.name));
                        })
                      }
                      title="Click to toggle; double-click to show only this"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "1px 6px",
                        border: `1px solid ${HAIRLINE}`,
                        borderRadius: 10,
                        background: off ? "#f4f4f4" : "#fff",
                        color: off ? INK.faint : "#333",
                        cursor: "pointer",
                        fontSize: FS.small,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: off ? "#ccc" : kp.color,
                          border: "1px solid #0003",
                          flexShrink: 0,
                        }}
                      />
                      {shortName(kp.name)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trajectories: each keypoint's recent motion path. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                borderTop: `1px solid ${HAIRLINE}`,
                paddingTop: 8,
              }}
            >
              <span style={{ color: INK.muted, fontSize: FS.small }}>
                Trajectories
              </span>
              <label
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                title="Draw each keypoint's recent path (fading trail)"
              >
                <input
                  type="checkbox"
                  checked={showTrails}
                  onChange={(e) => setShowTrails(e.target.checked)}
                />
                Show trails
              </label>
              {showTrails && (
                <label
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                  title="How far back in time each trail reaches"
                >
                  <span style={{ color: INK.faint, fontSize: FS.small }}>
                    window: {trailSec.toFixed(2)} s
                  </span>
                  <input
                    type="range"
                    min={0.25}
                    max={5}
                    step={0.25}
                    value={trailSec}
                    onChange={(e) => setTrailSec(Number(e.target.value))}
                  />
                </label>
              )}
            </div>

            {/* Confidence: hide low-confidence points, and/or fade by confidence.
                Shown when the file stores per-frame confidence (detected from
                metadata); the arrays are fetched lazily when a control engages. */}
            {pose.hasConfidence && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  borderTop: `1px solid ${HAIRLINE}`,
                  paddingTop: 8,
                }}
              >
                <span style={{ color: INK.muted, fontSize: FS.small }}>
                  Confidence
                </span>
                <label
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                  title="Keypoints below this confidence are not drawn"
                >
                  <span style={{ color: INK.faint, fontSize: FS.small }}>
                    hide below: {confThreshold.toFixed(2)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={confThreshold}
                    onChange={(e) => setConfThreshold(Number(e.target.value))}
                  />
                </label>
                <label
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                  title="Fade each shown keypoint's opacity by its confidence"
                >
                  <input
                    type="checkbox"
                    checked={fadeByConfidence}
                    onChange={(e) => setFadeByConfidence(e.target.checked)}
                  />
                  Fade by confidence
                </label>
              </div>
            )}
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
            <IconButton
              size="small"
              onClick={() => setPanelCollapsed(false)}
              title="Expand panel"
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
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

        {/* 3D pose cannot register on a 2D video without camera calibration; warn
            (the overlay is still drawn, the dots just will not sit on the animal). */}
        {pose.is3D && !poseOnlyMode && (
          <div
            style={{
              padding: "6px 10px",
              fontSize: FS.body,
              background: "#fff4e5",
              color: "#8a5a00",
            }}
          >
            This is 3D pose
            {pose.spatialUnit
              ? ` (${pose.spatialUnit}, world coordinates)`
              : " (world coordinates)"}
            ; on a 2D video the keypoints cannot register without the camera
            calibration, which is not in this file, so the dots will not sit on
            the animal. Use "Pose only" to view the pose on its own.
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
                onError={(e) => {
                  const code = e.currentTarget.error?.code;
                  // ABORTED fires normally when the src is swapped to another
                  // video; it is not a real failure, so ignore it.
                  if (code === MediaError.MEDIA_ERR_ABORTED) return;
                  // A network failure is transient (dropped connection, expired
                  // presigned URL): report it as such rather than blaming the
                  // codec, but still fall back to pose-only.
                  if (code === MediaError.MEDIA_ERR_NETWORK) {
                    setVideoError("network error while loading the video");
                    return;
                  }
                  // Unsupported container/codec or a decode failure: this element
                  // genuinely cannot show the frame.
                  setCodecError(true);
                }}
                onLoadedMetadata={(e) => {
                  if (videoSeededRef.current || !video) return;
                  videoSeededRef.current = true;
                  const raw = searchParams.get("poseTime");
                  if (raw === null || !Number.isFinite(Number(raw))) return;
                  const v = e.currentTarget;
                  v.currentTime = sessionTimeToVideoTime(
                    Number(raw),
                    v.duration,
                    video.startTime,
                    video.timestamps,
                    offset,
                  );
                  v.pause();
                }}
                onPause={(e) => {
                  if (!video) return;
                  const v = e.currentTarget;
                  writePoseTime(
                    videoTimeToSessionTime(
                      v.currentTime,
                      v.duration,
                      video.startTime,
                      video.timestamps,
                      offset,
                    ),
                  );
                }}
                onSeeked={(e) => {
                  const v = e.currentTarget;
                  if (!video || !v.paused) return;
                  writePoseTime(
                    videoTimeToSessionTime(
                      v.currentTime,
                      v.duration,
                      video.startTime,
                      video.timestamps,
                      offset,
                    ),
                  );
                }}
                onPlay={() => writePoseTime(null)}
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
                const clk = poseClock.current;
                const next = !clk.playing;
                // Pressing play at the end restarts from the beginning.
                if (next && clk.t >= pose.timeRange.end) {
                  clk.t = pose.timeRange.start;
                  setPoseUiTime(pose.timeRange.start);
                }
                clk.playing = next;
                setPosePlaying(next);
                if (next) writePoseTime(null);
                else writePoseTime(clk.t);
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
                setCurrentTime(t); // scrubbing drives the shared clock
              }}
              onPointerUp={() => {
                if (!poseClock.current.playing)
                  writePoseTime(poseClock.current.t);
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
