import {
  getHdf5DatasetData,
  getRedirectUrl,
  useHdf5Group,
} from "@hdf5Interface";
import ViewError from "@components/ViewError/ViewError";
import { useCssVars } from "@components/useCssVars";
import {
  AccordionItem,
  Checkbox,
  InlineMessage,
  LoadingState,
  Playback,
  SegmentedControl,
  Select,
  Slider,
  Spinner,
  TimeOverview,
  ViewPanel,
} from "@ui";
import {
  FunctionComponent,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useSetSearchParamsKeepingHash } from "../../urlHash";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import getAuthorizationHeaderForUrl from "../../../util/getAuthorizationHeaderForUrl";
import {
  normalizeExternalFileValue,
  resolveExternalVideoUrl,
  VideoProblem,
  videoProblemOf,
} from "../../externalVideoUtils";
import VideoUnavailable from "../../VideoUnavailable";
import NumberSetting from "../common/NumberSetting";
import { parseOptional } from "../common/parseOptional";
import {
  TIME_VIEW_CHROME,
  TIME_VIEW_INSET,
  TIME_VIEW_SETTINGS,
  TIME_VIEW_TITLE,
} from "../common/TimeView";
import { useTimeWindow } from "../common/useTimeWindow";
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
import "./PoseEstimationView.css";

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

type SectionKey = "view" | "video" | "markers" | "trails" | "confidence";

// Leading-window first paint: rows loaded up front so the overlay renders fast;
// the full coordinate arrays then stream in the background and swap in.
const LEADING_FRAMES = 6000;
const THIS_FILE = "__this__";
const NO_SOURCE = "__empty__";
/** The time slider's height under the playback controls. */
const SEEK_HEIGHT = 48;

const plural = (n: number, word: string) =>
  `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

const MarkerRow: FunctionComponent<{
  label: string;
  color: string;
  shown: boolean;
  onShownChange: (shown: boolean) => void;
  onSolo: () => void;
}> = ({ label, color, shown, onShownChange, onSolo }) => {
  const ref = useCssVars<HTMLDivElement>({ "--marker-color": color });
  return (
    <div
      ref={ref}
      className="pose-marker"
      data-off={shown ? undefined : ""}
      title="Double-click to show only this marker"
      onDoubleClick={onSolo}
    >
      <Checkbox label={label} checked={shown} onChange={onShownChange} />
      <span className="pose-marker-swatch" aria-hidden="true" />
    </div>
  );
};

/** The video area: what the frame, settings and time slider leave of the view. */
const PoseStage: FunctionComponent<{
  width: number;
  height: number;
  children: ReactNode;
}> = ({ width, height, children }) => {
  const ref = useCssVars<HTMLDivElement>({
    "--pose-w": Math.max(240, width - TIME_VIEW_INSET - TIME_VIEW_SETTINGS),
    "--pose-h": Math.max(
      200,
      height - TIME_VIEW_CHROME - TIME_VIEW_TITLE - SEEK_HEIGHT,
    ),
  });
  return (
    <div ref={ref} className="pose-stage">
      {children}
    </div>
  );
};

// The ndx-pose overlay: keypoints drawn over a chosen external-file video, or on
// their own, on the shared session clock (no link between pose and video needed).
const PoseEstimationView: FunctionComponent<Props> = ({
  width = 800,
  height = 600,
  nwbUrl,
  path,
}) => {
  const [searchParams] = useSearchParams();
  const setSearchParams = useSetSearchParamsKeepingHash();
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
  const [videoProblem, setVideoProblem] = useState<VideoProblem>();
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
  // The control is temporarily removed pending a full alignment panel; the time
  // mapping still takes an offset, so keep it fixed at 0 for now.
  const offset = 0;
  // Cross-file sibling-asset scan state (the pose's videos may live in another
  // asset of the same session, e.g. IBL).
  const [scanning, setScanning] = useState(false);
  // True once video discovery (in-file + any sibling scan) has fully concluded,
  // so "no video found anywhere" can be told apart from "not searched yet".
  const [discoveryDone, setDiscoveryDone] = useState(false);
  // User toggle to view the pose alone (no video) even when a video exists.
  const [forcePoseOnly, setForcePoseOnly] = useState(false);
  // Pose-only playback clock (kept in a ref so the rAF loop does not re-render
  // every frame); the slider mirrors it at ~10 Hz.
  const poseClock = useRef({ t: 0, playing: false, last: 0 });
  const [poseUiTime, setPoseUiTime] = useState(0);
  const [posePlaying, setPosePlaying] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const speedRef = useRef(1);
  speedRef.current = Number(speed);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    view: true,
    video: true,
    markers: true,
    trails: false,
    confidence: false,
  });
  const section = (key: SectionKey) => ({
    open: open[key],
    onToggle: (o: boolean) => setOpen((prev) => ({ ...prev, [key]: o })),
  });
  const timeWindow = useTimeWindow();

  const group = useHdf5Group(nwbUrl, path);
  const [sourceSoftware, setSourceSoftware] = useState<string>();
  useEffect(() => {
    setSourceSoftware(undefined);
    if (!group?.datasets.some((d) => d.name === "source_software")) return;
    let canceled = false;
    getHdf5DatasetData(nwbUrl, `${path}/source_software`, {})
      .then(
        (v) => !canceled && setSourceSoftware(normalizeExternalFileValue(v)),
      )
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [group, nwbUrl, path]);

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
  const noPlayableVideo = !selectedCandidate || !!videoProblem;
  // Render the pose alone (on a plain canvas with its own clock) when the user
  // picks "Pose only" (forcePoseOnly), or as a fallback when no playable video
  // exists once the sibling scan has finished. An explicit Pose-only choice wins
  // immediately, even mid-scan, so 3D (which defaults to it) never waits.
  const poseOnlyMode = forcePoseOnly || (!scanning && noPlayableVideo);
  const poseExtent = useMemo(() => (pose ? getPoseExtent(pose) : null), [pose]);

  // Group discovered videos by their source file for the two-step picker (which
  // source file, then which video within it).
  const sources: { key: string; label: string; videos: VideoCandidate[] }[] =
    [];
  for (const c of candidates) {
    const key = c.sourceNwbUrl || THIS_FILE;
    let s = sources.find((x) => x.key === key);
    if (!s) {
      s = { key, label: c.sourceLabel || "(this file)", videos: [] };
      sources.push(s);
    }
    s.videos.push(c);
  }
  const selectedSource = selectedCandidate
    ? sources.find(
        (s) => s.key === (selectedCandidate.sourceNwbUrl || THIS_FILE),
      )
    : sources[0];
  const selectedSourceKey = selectedSource?.key ?? NO_SOURCE;

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
    if (g("poseEdges") === "1") setShowEdges(true);
    // 3D pose defaults to pose-only (overlaying world coordinates on a 2D camera
    // is meaningless); an explicit poseOnly param or a chosen poseVideo wins.
    if (g("poseOnly") === "1") setForcePoseOnly(true);
    else if (pose.is3D && !g("poseVideo")) setForcePoseOnly(true);
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
  // Auto-enable the skeleton once per container in the pure pose-only (no video
  // found anywhere) case; see the effect after discovery below.
  const edgesDefaultedRef = useRef(false);

  // Load the pose container in two phases: a small leading window first (so the
  // overlay paints in a few seconds), then the full coordinate arrays in the
  // background, swapped in when ready. Small files skip phase 2 (the window
  // already held everything). See the performance note in the design doc.
  useEffect(() => {
    let canceled = false;
    setPose(null);
    setPoseError(undefined);
    setLoadingFull(false);
    setDiscoveryDone(false);
    confMapRef.current = null; // drop the previous container's confidence cache
    edgesDefaultedRef.current = false; // re-evaluate the skeleton default per container
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
    setDiscoveryDone(false);
    (async () => {
      const poseName = path.split("/").pop() || "";
      const originalVideos = originalVideosRef.current;
      const cands = await findVideoCandidates(nwbUrl, originalVideos, poseName);
      if (canceled) return;
      if (cands.length > 0) {
        setCandidates(cands);
        setSelectedVideoPath((prev) => prev || (cands[0]?.path ?? ""));
        setDiscoveryDone(true);
        return;
      }
      // No video in this file: look in sibling assets of the same session.
      if (!dandisetId) {
        setCandidates([]);
        setDiscoveryDone(true);
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
      setDiscoveryDone(true);
    })();
    return () => {
      canceled = true;
    };
  }, [poseReady, nwbUrl, path, dandisetId, dandisetVersion]);

  // Default the skeleton ON for a pure pose-only view: once discovery concludes
  // with NO video anywhere and the file defines skeleton edges, turn edges on so
  // the dot cloud reads as a body (with no video behind it, the skeleton matters
  // more). Once per container, and only when the URL did not set poseEdges; a
  // later manual toggle still wins because the once-guard stops it re-applying.
  useEffect(() => {
    if (!hydrated || edgesDefaultedRef.current) return;
    if (!discoveryDone || !pose || pose.edges.length === 0) return;
    edgesDefaultedRef.current = true;
    if (candidates.length === 0 && searchParams.get("poseEdges") === null) {
      setShowEdges(true);
    }
  }, [hydrated, discoveryDone, pose, candidates, searchParams]);

  // Resolve the selected video to a playable URL + its session-time range. The
  // candidate may live in a sibling asset (cross-file), so resolve against its
  // own source file rather than the pose file.
  useEffect(() => {
    if (!selectedVideoPath) return;
    const cand = candidates.find((c) => c.path === selectedVideoPath);
    const srcUrl = cand?.sourceNwbUrl || nwbUrl;
    let canceled = false;
    setVideo(null);
    setVideoPlaying(false);
    setVideoProblem(undefined);
    setFrameSize(null);
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
        if (!canceled) setVideoProblem(videoProblemOf(err));
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
        clk.t += dt * speedRef.current;
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

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = Number(speed);
  }, [speed, video]);

  if (poseError) return <ViewError what="the pose overlay" error={poseError} />;
  if (!pose) return <LoadingState label="Loading the pose" phase="loading" />;

  const name = path.split("/").pop() || path;
  const allNames = pose.keypoints.map((k) => k.name);
  const shownCount = allNames.length - hidden.size;
  const sampleCounts = pose.keypoints.map((k) => k.timestamps.length);
  const samples = Math.max(...sampleCounts);
  const videoName = selectedCandidate?.name;
  const size =
    frameSize ??
    (poseOnlyMode && pose.dimensions[0]?.[0] > 0
      ? { w: pose.dimensions[0][1], h: pose.dimensions[0][0] }
      : null);
  const sizeText = size ? `${size.w} × ${size.h}` : null;
  const summary = [
    plural(pose.keypoints.length, "marker"),
    sampleCounts.every((n) => n === samples)
      ? `${samples.toLocaleString("en-US")} samples each`
      : `up to ${samples.toLocaleString("en-US")} samples`,
    sourceSoftware,
    poseOnlyMode
      ? ["pose only", sizeText].filter(Boolean).join(", ")
      : videoName && ["over " + videoName, sizeText].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
  const chartTitle = `${name} · ${plural(pose.keypoints.length, "marker")} ${
    poseOnlyMode || !videoName ? "on their own" : `over ${videoName}`
  }`;

  // How the pose and video spans line up on the session clock, once resolved.
  const videoHasTime = !!video && video.endTime > video.startTime;
  const overlaps =
    videoHasTime &&
    Math.min(pose.timeRange.end, video.endTime) >
      Math.max(pose.timeRange.start, video.startTime);
  const alignment =
    !video || poseOnlyMode
      ? null
      : !videoHasTime
        ? "This video has no frame times, so it starts at session time 0. If the markers don't sit on the whisker, try another video."
        : !overlaps
          ? "The pose and this video don't overlap in time. Choose another video."
          : null;

  const fileOptions = scanning
    ? [{ value: NO_SOURCE, label: "Searching this session…" }]
    : sources.map((s) => ({
        value: s.key,
        label: s.key === THIS_FILE ? "This file" : s.label,
      }));
  const videoOptions = scanning
    ? [{ value: "", label: "Searching this session…" }]
    : (selectedSource?.videos ?? []).map((c, index) => ({
        value: c.path,
        label: [
          c.name,
          selectedSource?.videos.some((o) => o !== c && o.name === c.name)
            ? c.externalBasename
            : "",
          index === 0 && c.score > 0 ? "suggested" : "",
        ]
          .filter(Boolean)
          .join(" · "),
        meta: c.externalBasename,
      }));

  const playing = poseOnlyMode ? posePlaying : videoPlaying;
  const time = poseOnlyMode
    ? poseUiTime
    : (currentTime ?? pose.timeRange.start);
  const setPlaying = (next: boolean) => {
    if (!poseOnlyMode) {
      const v = videoRef.current;
      if (next) v?.play().catch(() => {});
      else v?.pause();
      return;
    }
    const clk = poseClock.current;
    // Pressing play at the end restarts from the beginning.
    if (next && clk.t >= pose.timeRange.end) {
      clk.t = pose.timeRange.start;
      setPoseUiTime(pose.timeRange.start);
    }
    clk.playing = next;
    setPosePlaying(next);
    writePoseTime(next ? null : clk.t);
  };
  const seek = (t: number) => {
    setCurrentTime(t);
    if (poseOnlyMode) {
      poseClock.current.t = t;
      setPoseUiTime(t);
      if (!poseClock.current.playing) writePoseTime(t);
      return;
    }
    const v = videoRef.current;
    if (v && video)
      v.currentTime = sessionTimeToVideoTime(
        t,
        v.duration,
        video.startTime,
        video.timestamps,
        offset,
      );
  };
  const onStageKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== " " || e.target !== e.currentTarget) return;
    e.preventDefault();
    setPlaying(!playing);
  };

  const toggleMarker = (kp: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(kp)) next.delete(kp);
      else next.add(kp);
      return next;
    });
  const soloMarker = (kp: string) =>
    setHidden((prev) => {
      const isolated = prev.size === allNames.length - 1 && !prev.has(kp);
      return isolated ? new Set() : new Set(allNames.filter((n) => n !== kp));
    });

  const showProblem = !!videoProblem && !forcePoseOnly;
  const finding = scanning || (!poseOnlyMode && !video);

  return (
    <ViewPanel
      label={name}
      summary={summary}
      chartTitle={chartTitle}
      busy={finding}
      controls={
        <>
          <Playback
            playing={playing}
            onPlayingChange={setPlaying}
            speed={speed}
            onSpeedChange={setSpeed}
            time={time}
          />
          <div className="pose-seek">
            <Slider
              label="Time"
              unit="s"
              unitName="seconds"
              min={pose.timeRange.start}
              max={pose.timeRange.end}
              step={0.01}
              value={Math.min(
                pose.timeRange.end,
                Math.max(pose.timeRange.start, time),
              )}
              onChange={seek}
              showValue={false}
              showField={false}
            />
          </div>
          {(loadingFull || loadingConf) && (
            <span className="pose-status" role="status">
              <Spinner />
              {loadingFull ? "Loading full resolution…" : "Loading confidence…"}
            </span>
          )}
        </>
      }
      overview={
        timeWindow.ready && (
          <TimeOverview
            session={timeWindow.session}
            value={timeWindow.value}
            cursor={timeWindow.cursor}
            onChange={timeWindow.onChange}
          />
        )
      }
      settings={
        <>
          <AccordionItem
            title="View"
            summary={poseOnlyMode ? "Pose only" : "Overlay"}
            {...section("view")}
          >
            <SegmentedControl
              label="View"
              size="sm"
              value={poseOnlyMode ? "pose" : "overlay"}
              onChange={(v) => {
                setVideoPlaying(false);
                setForcePoseOnly(v === "pose");
              }}
              options={[
                {
                  value: "overlay",
                  label: "Overlay",
                  disabled: !scanning && noPlayableVideo,
                },
                { value: "pose", label: "Pose only" },
              ]}
            />
            {pose.is3D && (
              <InlineMessage status={poseOnlyMode ? "info" : "warning"}>
                This is 3D pose
                {pose.spatialUnit
                  ? ` (${pose.spatialUnit}, world coordinates)`
                  : " (world coordinates)"}
                . Without the camera calibration, which this file doesn't have,
                the markers can't sit on a 2D video, so it's shown on its own.
              </InlineMessage>
            )}
          </AccordionItem>

          <AccordionItem
            title="Video"
            summary={poseOnlyMode ? "Pose only" : (videoName ?? "Pose only")}
            {...section("video")}
          >
            {scanning || candidates.length > 0 ? (
              <>
                <Select
                  label="File"
                  size="sm"
                  value={scanning ? NO_SOURCE : selectedSourceKey}
                  disabled={scanning || forcePoseOnly}
                  options={fileOptions}
                  onChange={(k) => {
                    const first = sources.find((s) => s.key === k)?.videos[0];
                    if (first) setSelectedVideoPath(first.path);
                  }}
                />
                <Select
                  label="Video"
                  size="sm"
                  value={scanning ? "" : selectedVideoPath}
                  disabled={scanning || forcePoseOnly}
                  options={videoOptions}
                  onChange={setSelectedVideoPath}
                />
              </>
            ) : (
              discoveryDone && (
                <InlineMessage status="info">
                  No video found for this pose, in this file or the rest of the
                  session, so it's shown on its own.
                </InlineMessage>
              )
            )}
            {alignment && (
              <InlineMessage status="warning">{alignment}</InlineMessage>
            )}
          </AccordionItem>

          <AccordionItem
            title="Markers"
            summary={`${shownCount} of ${allNames.length} shown`}
            {...section("markers")}
          >
            <Checkbox
              label="All markers"
              checked={
                hidden.size === 0 ? true : shownCount === 0 ? false : "mixed"
              }
              onChange={(all) => setHidden(new Set(all ? [] : allNames))}
            />
            <div className="pose-markers">
              {pose.keypoints.map((kp) => (
                <MarkerRow
                  key={kp.name}
                  label={shortName(kp.name)}
                  color={kp.color}
                  shown={!hidden.has(kp.name)}
                  onShownChange={() => toggleMarker(kp.name)}
                  onSolo={() => soloMarker(kp.name)}
                />
              ))}
            </div>
            {pose.edges.length > 0 && (
              <Checkbox
                label="Skeleton"
                count={plural(pose.edges.length, "edge")}
                checked={showEdges}
                onChange={setShowEdges}
              />
            )}
          </AccordionItem>

          <AccordionItem
            title="Trails"
            summary={showTrails ? `${trailSec.toFixed(2)} s` : "Off"}
            {...section("trails")}
          >
            <Checkbox
              label="Show trails"
              checked={showTrails}
              onChange={setShowTrails}
            />
            {showTrails && (
              <NumberSetting
                label="Trail length (s)"
                value={trailSec}
                onChange={(text) => {
                  const n = parseOptional(text);
                  if (n !== null && n > 0) setTrailSec(n);
                }}
              />
            )}
          </AccordionItem>

          {pose.hasConfidence && (
            <AccordionItem
              title="Confidence"
              summary={
                confThreshold > 0
                  ? `Below ${confThreshold.toFixed(2)} hidden`
                  : "All shown"
              }
              {...section("confidence")}
            >
              <NumberSetting
                label="Hide below"
                placeholder="0"
                value={confThreshold > 0 ? confThreshold : null}
                onChange={(text) =>
                  setConfThreshold(
                    Math.min(1, Math.max(0, parseOptional(text) ?? 0)),
                  )
                }
              />
              <Checkbox
                label="Fade by confidence"
                checked={fadeByConfidence}
                onChange={setFadeByConfidence}
              />
            </AccordionItem>
          )}
        </>
      }
    >
      <PoseStage width={width} height={height}>
        {showProblem && videoProblem && (
          <VideoUnavailable problem={videoProblem} />
        )}
        <div
          ref={boxRef}
          className="pose-box"
          tabIndex={0}
          aria-label={`${chartTitle}. Space plays and pauses.`}
          onKeyDown={onStageKeyDown}
        >
          {finding ? (
            <LoadingState label="Finding the video on DANDI" phase="loading" />
          ) : poseOnlyMode ? (
            <canvas
              ref={canvasRef}
              className="pose-layer"
              width={box.w}
              height={box.h}
            />
          ) : (
            video && (
              <>
                <video
                  ref={videoRef}
                  className="pose-layer"
                  src={video.url}
                  muted
                  playsInline
                  onError={(e) => {
                    const code = e.currentTarget.error?.code;
                    // ABORTED fires normally when the src is swapped to another
                    // video; it is not a real failure, so ignore it.
                    if (code === MediaError.MEDIA_ERR_ABORTED) return;
                    setVideoPlaying(false);
                    // A network failure is transient (dropped connection, expired
                    // presigned URL), not the codec; both fall back to pose-only.
                    setVideoProblem({
                      kind:
                        code === MediaError.MEDIA_ERR_NETWORK
                          ? "network"
                          : "format",
                    });
                  }}
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    v.playbackRate = Number(speed);
                    setFrameSize({ w: v.videoWidth, h: v.videoHeight });
                    if (videoSeededRef.current || !video) return;
                    videoSeededRef.current = true;
                    const raw = searchParams.get("poseTime");
                    if (raw === null || !Number.isFinite(Number(raw))) return;
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
                    setVideoPlaying(false);
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
                  onPlay={() => {
                    setVideoPlaying(true);
                    writePoseTime(null);
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="pose-layer pose-layer--markers"
                  width={box.w}
                  height={box.h}
                />
              </>
            )
          )}
        </div>
      </PoseStage>
    </ViewPanel>
  );
};

export default PoseEstimationView;
