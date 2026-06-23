import { getHdf5Group, getRedirectUrl } from "@hdf5Interface";
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import getAuthorizationHeaderForUrl from "../../../util/getAuthorizationHeaderForUrl";
import { IconButton, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  getSeriesTimeRange,
  resolveExternalVideoUrl,
} from "../../externalVideoUtils";
import {
  getPoseExtent,
  loadPoseEstimation,
  PoseData,
  SourceRect,
} from "../PoseEstimation/poseEstimationUtils";
import BehavioralBoutsMontage from "./BehavioralBoutsMontage";
import BoutsDistributionStrip from "./BoutsDistributionStrip";
import BoutsTimeline from "./BoutsTimeline";
import {
  BehavioralBoutsData,
  Bout,
  buildFeatureScale,
  ClipMark,
  clipLabel,
  compareByFeature,
  formatFeatureValue,
  formatTime,
  loadBehavioralBouts,
  loadObservationIntervals,
  numericExtraColumns,
  ObservationInterval,
  OBSERVED_INK,
  resolveSourcePosePath,
  resolveSourceVideoSeriesPath,
  seededShuffle,
} from "./behavioralBoutsUtils";

// A pre-built table the view can render instead of loading it from HDF5. The
// VAME adapter uses this: run-length-encoded motifs + the resolved pose/video,
// so the VAME viewer IS this viewer, fed a different way.
export type PreloadedBouts = {
  title: string;
  data: BehavioralBoutsData;
  observed: ObservationInterval[] | null;
  hasVideo: boolean;
  videoUrl?: string;
  videoStartTime: number;
  poseData: PoseData | null;
  poseSrcExtent: SourceRect | null;
  // Default pose/video alignment offset (VAME ≈ 0.5 s; BehavioralBouts 0).
  defaultOffsetSec?: number;
};

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
  // When set (the VAME adapter), render this pre-built table instead of loading
  // from nwbUrl/path; nwbUrl/path are then ignored (but still passed by callers).
  preloaded?: PreloadedBouts;
};

const HEADER_H = 38;
const SIDEBAR_W = 240;
const MAX_CLIPS = 16;
const DEFAULT_CLIPS = 4;
const MAX_TABLE_ROWS = 200;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const BehavioralBoutsView: FunctionComponent<Props> = ({
  width = 900,
  height = 600,
  nwbUrl,
  path,
  preloaded,
}) => {
  const [searchParams] = useSearchParams();
  const num = (key: string, def: number) => {
    const v = searchParams.get(key);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : def;
  };
  const bool = (key: string, def: boolean) => {
    const v = searchParams.get(key);
    return v === null ? def : v === "1";
  };

  const [data, setData] = useState<BehavioralBoutsData>();
  const [observed, setObserved] = useState<ObservationInterval[] | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const [videoUrl, setVideoUrl] = useState<string>();
  const [hasVideo, setHasVideo] = useState(false);
  const [videoStartTime, setVideoStartTime] = useState(0);

  const [poseData, setPoseData] = useState<PoseData | null>(null);
  const [poseSrcExtent, setPoseSrcExtent] = useState<SourceRect | null>(null);

  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(() => {
    const v = searchParams.get("bbLabel");
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  });
  const [clipCount, setClipCount] = useState(() =>
    num("bbTiles", DEFAULT_CLIPS),
  );
  const [minBoutMs, setMinBoutMs] = useState(() => num("bbMinBout", 0));
  const [padSec, setPadSec] = useState(() => num("bbPad", 0.5));
  // Pose/video alignment offset (s). 0 for well-formed BehavioralBouts files; the
  // VAME adapter seeds it from preloaded.defaultOffsetSec (≈0.5 on the OFT data).
  const [offsetSec, setOffsetSec] = useState(() =>
    num("bbOffset", preloaded?.defaultOffsetSec ?? 0),
  );
  const [seed, setSeed] = useState(() => num("bbSeed", 1));
  // How the behavior selector list is ordered (sidebar control, above the list):
  // a structural key ("mean" duration / "count" / "total" / "name") or a numeric
  // extra column name, meaning "by the per-behavior mean of that column".
  const [behaviorOrder, setBehaviorOrder] = useState<string>(
    () => searchParams.get("bbOrder") || "mean",
  );
  // The numeric extra column (kinematic feature) to show: big on each montage
  // tile + a "column = value" line under the bottom-timeline clip letters. Color
  // is never used for it. Sorting the montage by it is opt-in (sortOn). One at a
  // time (the per-bout table carries all columns); null = none, the default.
  const [featureColumn, setFeatureColumn] = useState<string | null>(
    () => searchParams.get("bbValue") || null,
  );
  const [sortOn, setSortOn] = useState<boolean>(
    () => searchParams.get("bbSort") === "1",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() =>
    searchParams.get("bbSortDir") === "asc" ? "asc" : "desc",
  );
  const [playing, setPlaying] = useState(true);
  const [showPose, setShowPose] = useState(() => bool("bbPose", true));
  const [showEdges, setShowEdges] = useState(() => bool("bbEdges", true));
  const [showTrails, setShowTrails] = useState(() => bool("bbTrails", false));
  const [trailSec, setTrailSec] = useState(() => num("bbTrailSec", 1));
  const [resetSignal, setResetSignal] = useState(0);
  // Collapse the left sidebar to give the montage + bottom timeline full width.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Guards the one-shot skeleton default (on for pose-only, off when a video).
  const edgesAutoRef = useRef(false);

  // ----- Load bouts + links (or accept a preloaded table) -----
  useEffect(() => {
    // Preloaded mode (VAME adapter): adopt the supplied table directly, no HDF5.
    if (preloaded) {
      setLoading(false);
      setLoadError(undefined);
      setData(preloaded.data);
      setObserved(preloaded.observed);
      setHasVideo(preloaded.hasVideo);
      setVideoUrl(preloaded.videoUrl);
      setVideoStartTime(preloaded.videoStartTime);
      setPoseData(preloaded.poseData);
      setPoseSrcExtent(preloaded.poseSrcExtent);
      edgesAutoRef.current = false;
      return;
    }
    if (!nwbUrl || !path) return;
    let canceled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(undefined);
      setData(undefined);
      setObserved(null);
      setVideoUrl(undefined);
      setHasVideo(false);
      setVideoStartTime(0);
      setPoseData(null);
      setPoseSrcExtent(null);
      edgesAutoRef.current = false;
      try {
        const group = await getHdf5Group(nwbUrl, path);
        if (!group) throw new Error(`Unable to load group at ${path}.`);
        const boutsData = await loadBehavioralBouts(nwbUrl, path, group);
        if (canceled) return;
        setData(boutsData);
        const obs = await loadObservationIntervals(nwbUrl, group);
        if (canceled) return;
        setObserved(obs);

        const seriesPath = await resolveSourceVideoSeriesPath(nwbUrl, group);
        if (!canceled && seriesPath) {
          try {
            const range = await getSeriesTimeRange(nwbUrl, seriesPath);
            const downloadUrl = await resolveExternalVideoUrl(
              nwbUrl,
              seriesPath,
              searchParams.get("dandisetId"),
              searchParams.get("dandisetVersion") || "draft",
            );
            // A native <video> cannot send the DANDI auth header, so for an
            // embargoed asset the /download/ URL 401s. Pre-resolve the presigned
            // S3 URL (with auth) and play that; a no-op for public assets.
            const auth = getAuthorizationHeaderForUrl(downloadUrl);
            const redirected = await getRedirectUrl(
              downloadUrl,
              auth ? { Authorization: auth } : undefined,
            );
            if (!canceled) {
              setVideoStartTime(range.startTime || 0);
              setVideoUrl(redirected || downloadUrl);
              setHasVideo(true);
            }
          } catch (err) {
            console.warn("BehavioralBouts: could not resolve video", err);
          }
        }

        const pp = await resolveSourcePosePath(nwbUrl, group);
        if (!canceled && pp) {
          const pose = await loadPoseEstimation(nwbUrl, pp);
          if (!canceled && pose) {
            setPoseData(pose);
            setPoseSrcExtent(getPoseExtent(pose));
          }
        }
      } catch (err) {
        if (!canceled)
          setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path, searchParams, preloaded]);

  // Per-behavior bout count + total duration (after the min-length filter).
  const summary = useMemo(() => {
    const m = new Map<number, { count: number; total: number }>();
    const minSec = minBoutMs / 1000;
    for (const b of data?.bouts || []) {
      const dur = b.stopTime - b.startTime;
      if (dur < minSec) continue;
      const e = m.get(b.labelId) || { count: 0, total: 0 };
      e.count += 1;
      e.total += dur;
      m.set(b.labelId, e);
    }
    return m;
  }, [data, minBoutMs]);

  const meanDur = (id: number) => {
    const e = summary.get(id);
    return e && e.count ? e.total / e.count : 0;
  };

  const filteredBouts = useMemo(() => {
    const minSec = minBoutMs / 1000;
    return (data?.bouts || []).filter(
      (b) => b.stopTime - b.startTime >= minSec,
    );
  }, [data, minBoutMs]);

  // Numeric extra columns the sort picker offers (empty for files with no
  // kinematics, e.g. asoid / deepethogram / mlost).
  const numericColumns = useMemo(
    () => numericExtraColumns(data?.bouts || [], data?.extraColumns || []),
    [data],
  );

  // Each BehavioralBouts table has its own columns, so drop any selected value
  // column that does not exist on the newly loaded object (only once data is in,
  // so columns pinned in the URL survive the initial empty-numericColumns render).
  useEffect(() => {
    if (!data) return;
    if (featureColumn && !numericColumns.includes(featureColumn)) {
      setFeatureColumn(null);
      setSortOn(false);
    }
    const STRUCTURAL = ["mean", "count", "total", "name"];
    if (
      !STRUCTURAL.includes(behaviorOrder) &&
      !numericColumns.includes(behaviorOrder)
    )
      setBehaviorOrder("mean");
  }, [data, numericColumns, featureColumn, behaviorOrder]);

  // When ordering behaviors by a kinematic column, the per-behavior mean of that
  // column over its (filtered) bouts (NaN values skipped). null for the
  // structural orderings (mean duration / count / total / name).
  const orderColumn = numericColumns.includes(behaviorOrder)
    ? behaviorOrder
    : null;
  const behaviorColMean = useMemo(() => {
    if (!orderColumn) return null;
    const acc = new Map<number, { sum: number; n: number }>();
    for (const b of filteredBouts) {
      const raw = b.extra?.[orderColumn];
      const v = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(v)) continue;
      const e = acc.get(b.labelId) || { sum: 0, n: 0 };
      e.sum += v;
      e.n += 1;
      acc.set(b.labelId, e);
    }
    const m = new Map<number, number>();
    for (const [id, e] of acc) m.set(id, e.n ? e.sum / e.n : NaN);
    return m;
  }, [orderColumn, filteredBouts]);

  // Feature scale for the chosen column, built over the SELECTED behavior's bouts.
  // null when none is picked, no behavior is selected, or the column is all-NaN.
  const featureScale = useMemo(() => {
    if (!featureColumn || selectedLabelId === null) return null;
    const sel = filteredBouts.filter((b) => b.labelId === selectedLabelId);
    return buildFeatureScale(sel, featureColumn);
  }, [featureColumn, selectedLabelId, filteredBouts]);

  // Default the selection to the longest-mean-duration behavior.
  useEffect(() => {
    if (!data) return;
    if (selectedLabelId !== null && summary.has(selectedLabelId)) return;
    let best: number | null = null;
    let bestMean = -1;
    for (const [id, e] of summary) {
      const mean = e.count ? e.total / e.count : 0;
      if (mean > bestMean) {
        bestMean = mean;
        best = id;
      }
    }
    if (best === null && data.labels.length > 0) best = data.labels[0].labelId;
    setSelectedLabelId(best);
  }, [data, summary, selectedLabelId]);

  // Skeleton default: on for pose-only, off when a video is present (less clutter
  // on the frame). Runs once per file, and only when the URL did not pin bbEdges.
  useEffect(() => {
    if (edgesAutoRef.current || !poseData) return;
    edgesAutoRef.current = true;
    if (searchParams.get("bbEdges") === null) setShowEdges(!hasVideo);
  }, [poseData, hasVideo, searchParams]);

  const displayedClips = useMemo(() => {
    if (!data || selectedLabelId === null) return [];
    const minSec = minBoutMs / 1000;
    const sel = data.bouts.filter(
      (b) =>
        b.labelId === selectedLabelId && b.stopTime - b.startTime >= minSec,
    );
    let picked: Bout[];
    if (featureScale && sortOn) {
      // Sorting on: top-N most-extreme bouts by the feature (A = most extreme),
      // kept in ranked order rather than re-sorted by time.
      picked = [...sel]
        .sort(compareByFeature(featureScale, sortDir))
        .slice(0, clipCount);
    } else {
      // Sorting off: the usual random sample in time order (values still shown).
      picked = seededShuffle(sel, seed).slice(0, clipCount);
      picked.sort((a, b) => a.startTime - b.startTime);
    }
    // Show the primary column's value big on every tile whenever one is picked,
    // independent of whether sorting is on.
    return picked.map((bout, index) => ({
      bout,
      label: clipLabel(index),
      featureValueText: featureScale
        ? formatFeatureValue(featureScale.value(bout))
        : undefined,
    }));
  }, [
    data,
    selectedLabelId,
    minBoutMs,
    seed,
    clipCount,
    featureScale,
    sortOn,
    sortDir,
  ]);

  const clipMarks: ClipMark[] = useMemo(
    () =>
      displayedClips.map((c) => ({
        startTime: c.bout.startTime,
        stopTime: c.bout.stopTime,
        labelId: c.bout.labelId,
        letter: c.label,
        extra: c.bout.extra,
      })),
    [displayedClips],
  );
  // start-time -> clip letter, to flag the sampled bouts in the table.
  const clipLetterByStart = useMemo(
    () => new Map(displayedClips.map((c) => [c.bout.startTime, c.label])),
    [displayedClips],
  );

  const hasPose = poseData !== null;
  const canMontage = hasVideo || hasPose;

  const domain = useMemo(() => {
    let minStart = Infinity;
    let maxStop = -Infinity;
    for (const b of data?.bouts || []) {
      if (b.startTime < minStart) minStart = b.startTime;
      if (b.stopTime > maxStop) maxStop = b.stopTime;
    }
    for (const o of observed || []) {
      if (o.start < minStart) minStart = o.start;
      if (o.stop > maxStop) maxStop = o.stop;
    }
    const domStart = isFinite(minStart) ? Math.min(minStart, 0) : 0;
    let domEnd = isFinite(maxStop) ? maxStop : 1;
    if (domEnd <= domStart) domEnd = domStart + 1;
    return { domStart, domEnd };
  }, [data, observed]);
  const sessionDur = domain.domEnd - domain.domStart;

  // Observation coverage: total observed time and whether any gap is unassessed.
  const coverage = useMemo(() => {
    if (!observed) return null;
    let total = 0;
    const sorted = [...observed].sort((a, b) => a.start - b.start);
    let cursor = domain.domStart;
    let hasGap = false;
    for (const o of sorted) {
      total += Math.max(0, o.stop - o.start);
      if (o.start > cursor + 1e-6) hasGap = true;
      cursor = Math.max(cursor, o.stop);
    }
    if (cursor < domain.domEnd - 1e-6) hasGap = true;
    return { total, hasGap, pct: sessionDur ? (total / sessionDur) * 100 : 0 };
  }, [observed, domain, sessionDur]);

  // Stats + bout list for the currently selected behavior (the selection table).
  const selectedStats = useMemo(() => {
    if (selectedLabelId === null) return null;
    const bouts = filteredBouts.filter((b) => b.labelId === selectedLabelId);
    if (!bouts.length) return null;
    // Display order matches the montage: by the active feature, else by time.
    const ordered =
      featureScale && sortOn
        ? [...bouts].sort(compareByFeature(featureScale, sortDir))
        : [...bouts].sort((a, b) => a.startTime - b.startTime);
    let total = 0;
    let min = Infinity;
    let max = 0;
    for (const b of bouts) {
      const d = b.stopTime - b.startTime;
      total += d;
      if (d < min) min = d;
      if (d > max) max = d;
    }
    return {
      bouts: ordered,
      count: bouts.length,
      total,
      min,
      max,
      mean: total / bouts.length,
      pct: sessionDur ? (total / sessionDur) * 100 : 0,
    };
  }, [filteredBouts, selectedLabelId, sessionDur, featureScale, sortOn, sortDir]);

  // Persist controls in the URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    const sync = (key: string, value: string, isDefault: boolean) => {
      if (isDefault) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    };
    sync("bbLabel", String(selectedLabelId), selectedLabelId === null);
    sync("bbTiles", String(clipCount), clipCount === DEFAULT_CLIPS);
    sync("bbSeed", String(seed), seed === 1);
    sync("bbMinBout", String(minBoutMs), minBoutMs === 0);
    sync("bbPad", String(padSec), padSec === 0.5);
    sync("bbOffset", String(offsetSec), offsetSec === 0);
    sync("bbPose", "0", showPose);
    sync("bbEdges", "0", showEdges);
    sync("bbTrails", "1", !showTrails);
    sync("bbTrailSec", String(trailSec), trailSec === 1);
    sync("bbOrder", behaviorOrder, behaviorOrder === "mean");
    sync("bbValue", featureColumn || "", !featureColumn);
    sync("bbSort", "1", !sortOn);
    sync("bbSortDir", sortDir, sortDir === "desc");
    window.history.replaceState(null, "", url.toString());
  }, [
    selectedLabelId,
    clipCount,
    seed,
    minBoutMs,
    padSec,
    offsetSec,
    showPose,
    showEdges,
    showTrails,
    trailSec,
    behaviorOrder,
    featureColumn,
    sortOn,
    sortDir,
  ]);

  if (loading)
    return <div style={{ padding: 20 }}>Loading behavioral bouts...</div>;
  if (loadError)
    return (
      <div style={{ padding: 20, color: "#a33" }}>
        Could not load BehavioralBouts: {loadError}
      </div>
    );
  if (!data) return null;

  const title =
    preloaded?.title ?? (path ? path.split("/").pop() || path : "");
  const cols = Math.max(1, Math.ceil(Math.sqrt(clipCount)));
  const selectedLabel =
    selectedLabelId === null
      ? undefined
      : data.labels.find((l) => l.labelId === selectedLabelId);
  const selectedColor = selectedLabel?.color || "#888";
  const selectedBoutCount = selectedStats?.count || 0;

  // The bottom timeline grows with the clip-letter line + one printed value line
  // per selected column (kept in sync with BoutsTimeline's LABEL_H / VALUE_H = 13).
  const bottomH = canMontage
    ? clamp(Math.round(height * 0.17), 80, 130) + 13 + (featureColumn ? 21 : 0)
    : 0;
  // The montage + bottom timeline span the area right of the sidebar (so the
  // timeline does not run under the left menu); full width when it is collapsed.
  const montageW = Math.max(40, width - (sidebarCollapsed ? 0 : SIDEBAR_W));

  const visibleLabels = data.labels
    .filter((l) => (summary.get(l.labelId)?.count || 0) > 0)
    .sort((a, b) => {
      if (orderColumn && behaviorColMean) {
        // By the per-behavior mean of the chosen column, highest first; behaviors
        // with no finite values (e.g. tracking gaps) sort last.
        const ma = behaviorColMean.get(a.labelId);
        const mb = behaviorColMean.get(b.labelId);
        const va = ma === undefined || !Number.isFinite(ma) ? -Infinity : ma;
        const vb = mb === undefined || !Number.isFinite(mb) ? -Infinity : mb;
        if (va !== vb) return vb - va;
        return meanDur(b.labelId) - meanDur(a.labelId);
      }
      if (behaviorOrder === "name") return a.name.localeCompare(b.name);
      if (behaviorOrder === "count")
        return (summary.get(b.labelId)?.count || 0) - (summary.get(a.labelId)?.count || 0);
      if (behaviorOrder === "total")
        return (summary.get(b.labelId)?.total || 0) - (summary.get(a.labelId)?.total || 0);
      return meanDur(b.labelId) - meanDur(a.labelId); // "mean" (default)
    });

  // ⓘ detail for the Summary section.
  const summaryInfo = [
    path,
    "namespace: ndx-behavioral-bouts",
    `session length: ${formatTime(sessionDur)}`,
    data.annotator ? `annotator: ${data.annotator}` : null,
    hasPose && poseData
      ? `pose: ${poseData.keypoints.length} keypoints, ${poseData.edges.length} skeleton edges`
      : "pose: none",
    hasVideo ? "video: external file (source_video)" : "video: none",
    coverage
      ? `observation_intervals: ${coverage.pct.toFixed(0)}% of session assessed${coverage.hasGap ? " (partial)" : " (full)"}`
      : "observation_intervals: none",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      data-testid="behavioral-bouts-view"
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Slim header: just the object name (the counts/provenance live in the
          sidebar Summary). For the no-montage case there is no sidebar, so the
          chips stay in the header there. */}
      <div
        style={{
          height: HEADER_H,
          padding: "4px 12px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          borderBottom: "1px solid #e2e2e2",
        }}
      >
        <strong style={{ fontSize: 14 }}>{title}</strong>
        {!canMontage && (
          <>
            <Chip text={`${data.bouts.length} bouts`} />
            <Chip text={`${data.labels.length} behaviors`} />
            {data.sourceSoftware && <Chip text={data.sourceSoftware} />}
            {coverage && (
              <Chip
                text={coverage.hasGap ? "partial coverage" : "fully observed"}
              />
            )}
            <Chip text="no video / no pose" muted />
          </>
        )}
      </div>

      {/* Montage mode: controls + sidebar + montage grid */}
      {canMontage && (
        <>
          <div
            style={{
              flexShrink: 0,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: 14,
              rowGap: 4,
              padding: "4px 10px",
              fontSize: 12,
              borderBottom: "1px solid #eee",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setPlaying((p) => !p)}
              style={{ padding: "3px 12px", cursor: "pointer" }}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <span style={{ color: "#666" }}>
              showing {displayedClips.length} of {selectedBoutCount}
            </span>
            <NumInput
              label="tiles:"
              value={clipCount}
              onChange={setClipCount}
              min={1}
              max={MAX_CLIPS}
            />
            {!sortOn && (
              <button
                onClick={() => setSeed((s) => s + 1)}
                style={{ cursor: "pointer", padding: "1px 8px" }}
                title="New random set of example bouts"
              >
                Resample
              </button>
            )}
            <NumInput
              label="min bout (ms):"
              value={minBoutMs}
              onChange={setMinBoutMs}
              min={0}
              step={50}
              width={60}
            />
            <NumInput
              label="pad (s):"
              value={padSec}
              onChange={setPadSec}
              min={0}
              step={0.1}
            />
            {hasVideo && (
              <NumInput
                label="offset (s):"
                value={offsetSec}
                onChange={setOffsetSec}
                step={0.1}
              />
            )}
            <button
              onClick={() => setResetSignal((s) => s + 1)}
              style={{ cursor: "pointer", padding: "1px 8px" }}
              title="Reset every tile's zoom (drag a box on a tile to zoom it; double-click a tile to reset just that one)"
            >
              Reset zoom
            </button>
            {hasPose && (
              <label style={{ whiteSpace: "nowrap", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showPose}
                  onChange={(e) => setShowPose(e.target.checked)}
                />{" "}
                pose
              </label>
            )}
            {hasPose && poseData!.edges.length > 0 && (
              <label style={{ whiteSpace: "nowrap", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showEdges}
                  onChange={(e) => setShowEdges(e.target.checked)}
                />{" "}
                skeleton
              </label>
            )}
            {hasPose && (
              <label style={{ whiteSpace: "nowrap", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showTrails}
                  onChange={(e) => setShowTrails(e.target.checked)}
                />{" "}
                trails
              </label>
            )}
            {hasPose && showTrails && (
              <NumInput
                label="trail (s):"
                value={trailSec}
                onChange={setTrailSec}
                min={0.1}
                step={0.1}
              />
            )}
            {!hasVideo && hasPose && (
              <span style={{ color: "#999" }}>pose-only (no video)</span>
            )}
          </div>

          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            {!sidebarCollapsed && (
            <div
              style={{
                width: SIDEBAR_W,
                borderRight: "1px solid #eee",
                flexShrink: 0,
                overflowY: "auto",
                fontSize: 12,
              }}
            >
              {/* Summary (orientation; the old header chips live here now) */}
              <div
                style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <SectionTitle text="Summary" info={summaryInfo} />
                  <IconButton
                    size="small"
                    onClick={() => setSidebarCollapsed(true)}
                    title="Collapse panel"
                    sx={{ p: 0.25 }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </div>
                <div style={{ color: "#444" }}>
                  {data.bouts.length} bouts · {data.labels.length} behaviors
                </div>
                {(data.labelingMethod ||
                  data.sourceSoftware ||
                  data.annotator) && (
                  <div style={{ color: "#888", fontSize: 11 }}>
                    {[data.labelingMethod, data.sourceSoftware, data.annotator]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                    marginTop: 4,
                  }}
                >
                  <Chip
                    text={hasVideo ? "video" : "no video"}
                    muted={!hasVideo}
                  />
                  {hasPose && <Chip text="pose" />}
                  {coverage && (
                    <Chip
                      text={
                        coverage.hasGap
                          ? `partial · ${coverage.pct.toFixed(0)}% assessed`
                          : "fully observed"
                      }
                    />
                  )}
                </div>
              </div>

              {/* Behavior ordering: how the selector list below is sorted. */}
              <div
                style={{
                  padding: "5px 8px",
                  borderBottom: "1px solid #eee",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <SectionTitle
                  text="order behaviors"
                  small
                  info={
                    "How the behavior list below is sorted. Mean duration (default) " +
                    "surfaces the most sustained behaviors first; count and total " +
                    "rank by how often / how long each occurs; name is alphabetical. " +
                    "Each kinematic column also ranks behaviors by its per-behavior " +
                    "mean (highest first), e.g. fastest behaviors by mean mean_speed."
                  }
                />
                <select
                  value={behaviorOrder}
                  onChange={(e) => setBehaviorOrder(e.target.value)}
                  style={{ fontSize: 11 }}
                >
                  <option value="mean">mean duration</option>
                  <option value="count">bout count</option>
                  <option value="total">total duration</option>
                  <option value="name">name</option>
                  {numericColumns.map((c) => (
                    <option key={c} value={c}>
                      mean {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Behavior selector */}
              <div style={{ padding: 6 }}>
                {visibleLabels.map((l) => {
                  const selected = l.labelId === selectedLabelId;
                  return (
                    <button
                      key={l.labelId}
                      onClick={() => setSelectedLabelId(l.labelId)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "3px 6px",
                        marginBottom: 3,
                        border: selected ? "2px solid #333" : "1px solid #ddd",
                        borderRadius: 6,
                        background: selected ? "#f0f0f0" : "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: l.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {l.name}
                      </span>
                      <span
                        style={{
                          color: "#999",
                          fontSize: 11,
                          whiteSpace: "nowrap",
                        }}
                        title={
                          orderColumn
                            ? `bouts · mean ${orderColumn}`
                            : "bouts · mean duration"
                        }
                      >
                        {summary.get(l.labelId)?.count || 0} ·{" "}
                        {orderColumn && behaviorColMean
                          ? formatFeatureValue(
                              behaviorColMean.get(l.labelId) ?? null,
                            )
                          : `${meanDur(l.labelId).toFixed(1)}s`}
                      </span>
                    </button>
                  );
                })}

                {/* "observed" legend row: labels the near-black coverage track on
                    both timelines. Not a behavior, so not selectable. */}
                {coverage && (
                  <div
                    title={
                      "The near-black track on the timelines marks the scored " +
                      "spans (observation_intervals). " +
                      `${coverage.pct.toFixed(0)}% of the session was assessed` +
                      (coverage.hasGap ? "." : " (full).")
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "3px 6px",
                      marginTop: 4,
                      borderTop: "1px solid #eee",
                      fontSize: 12,
                      color: "#777",
                      cursor: "default",
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: OBSERVED_INK,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, fontStyle: "italic" }}>observed</span>
                    <span
                      style={{ color: "#999", fontSize: 11, whiteSpace: "nowrap" }}
                    >
                      {coverage.pct.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Session timeline strip */}
              <div style={{ padding: 6, borderTop: "1px solid #eee" }}>
                <SectionTitle
                  text="session timeline"
                  small
                  info={
                    "One lane per behavior, colored by behavior and ordered by mean " +
                    "bout duration. Bouts shorter than 'min bout (ms)' are hidden here " +
                    "and in the montage. Click a lane (or a behavior above) to select " +
                    "it; the selected lane is highlighted."
                  }
                />
                <BoutsDistributionStrip
                  width={SIDEBAR_W - 12}
                  height={clamp(visibleLabels.length * 5 + 6, 44, 160)}
                  labels={visibleLabels}
                  bouts={filteredBouts}
                  domStart={domain.domStart}
                  domEnd={domain.domEnd}
                  selectedLabelId={selectedLabelId}
                  onSelectLabel={setSelectedLabelId}
                  observed={observed}
                  fade
                />
              </div>

              {/* Selected-behavior stats + bouts table (filtered to selection) */}
              {selectedStats && selectedLabel && (
                <div
                  style={{ padding: "6px 8px", borderTop: "1px solid #eee" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 600,
                      color: "#444",
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: 3,
                        background: selectedLabel.color,
                      }}
                    />
                    {selectedLabel.name}
                  </div>
                  <div style={{ color: "#888", fontSize: 11, marginBottom: 4 }}>
                    {selectedStats.count} bouts ·{" "}
                    {selectedStats.total.toFixed(1)}s total · mean{" "}
                    {selectedStats.mean.toFixed(1)}s (
                    {selectedStats.min.toFixed(1)}–
                    {selectedStats.max.toFixed(1)}s) ·{" "}
                    {selectedStats.pct.toFixed(1)}% of session
                  </div>
                  <div style={{ maxHeight: 180, overflow: "auto" }}>
                    <table
                      style={{
                        borderCollapse: "collapse",
                        fontSize: 11,
                        color: "#444",
                        width: "100%",
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={thStyle}></th>
                          <th
                            style={{ ...thStyle, cursor: "pointer" }}
                            onClick={() => setSortOn(false)}
                            title="Sort by start time"
                          >
                            start{!sortOn ? " ↑" : ""}
                          </th>
                          <th style={thStyle}>dur (s)</th>
                          {data.extraColumns.map((c) => {
                            const sortable = numericColumns.includes(c);
                            const shown = featureColumn === c;
                            const sorted = shown && sortOn;
                            return (
                              <th
                                key={c}
                                style={{
                                  ...thStyle,
                                  cursor: sortable ? "pointer" : "default",
                                  color: shown ? "#2c5aa0" : thStyle.color,
                                  fontWeight: sorted ? 700 : 600,
                                }}
                                onClick={
                                  sortable
                                    ? () => {
                                        if (featureColumn === c && sortOn)
                                          setSortDir((d) =>
                                            d === "desc" ? "asc" : "desc",
                                          );
                                        else {
                                          setFeatureColumn(c);
                                          setSortOn(true);
                                        }
                                      }
                                    : undefined
                                }
                                title={
                                  sortable
                                    ? "Click to show this value and sort by it"
                                    : undefined
                                }
                              >
                                {c}
                                {sorted ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStats.bouts
                          .slice(0, MAX_TABLE_ROWS)
                          .map((b: Bout, i: number) => {
                            const letter = clipLetterByStart.get(b.startTime);
                            return (
                              <tr
                                key={i}
                                style={{
                                  background: letter ? "#eef3fb" : undefined,
                                }}
                              >
                                <td style={tdStyle}>
                                  {letter ? (
                                    <strong style={{ color: "#2c5aa0" }}>
                                      {letter}
                                    </strong>
                                  ) : (
                                    i + 1
                                  )}
                                </td>
                                <td style={tdStyle}>
                                  {formatTime(b.startTime)}
                                </td>
                                <td style={tdStyle}>
                                  {(b.stopTime - b.startTime).toFixed(2)}
                                </td>
                                {data.extraColumns.map((c) => (
                                  <td key={c} style={tdStyle}>
                                    {fmtCell(b.extra?.[c])}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {selectedStats.bouts.length > MAX_TABLE_ROWS && (
                    <div style={{ color: "#aaa", fontSize: 10, marginTop: 2 }}>
                      first {MAX_TABLE_ROWS} of {selectedStats.bouts.length}
                    </div>
                  )}

                  {/* Value control: pick one numeric column to show. It is the big
                      number on each tile + a "column = value" line under the
                      timeline clip letters. Optional sort by it. None by default. */}
                  {numericColumns.length > 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        paddingTop: 6,
                        borderTop: "1px dashed #eee",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <SectionTitle
                        text="value"
                        small
                        info={
                          "Pick one numeric column to show. It appears as the big " +
                          "value on each montage tile and as a 'column = value' line " +
                          "under the clip letters on the bottom timeline. Tick 'sort' " +
                          "to order the montage by it. Click a column header in the " +
                          "table above to pick it here."
                        }
                      />
                      <select
                        value={featureColumn ?? ""}
                        onChange={(e) => {
                          const v = e.target.value || null;
                          setFeatureColumn(v);
                          if (!v) setSortOn(false);
                        }}
                        style={{ fontSize: 11 }}
                      >
                        <option value="">none</option>
                        {numericColumns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {featureColumn && (
                        <label
                          style={{
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={sortOn}
                            onChange={(e) => setSortOn(e.target.checked)}
                          />{" "}
                          sort
                        </label>
                      )}
                      {featureColumn && sortOn && (
                        <button
                          onClick={() =>
                            setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                          }
                          style={{
                            cursor: "pointer",
                            padding: "1px 8px",
                            fontSize: 11,
                          }}
                          title="Toggle sort direction"
                        >
                          {sortDir === "desc" ? "highest first" : "lowest first"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Right column: montage on top, the bottom timeline beneath it, so
                the timeline spans only the video area (not under the sidebar). */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {sidebarCollapsed && (
                <div
                  style={{ padding: "2px 4px", borderBottom: "1px solid #eee" }}
                >
                  <IconButton
                    size="small"
                    onClick={() => setSidebarCollapsed(false)}
                    title="Expand panel"
                    sx={{ p: 0.25 }}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                <BehavioralBoutsMontage
                  hasVideo={hasVideo}
                  videoUrl={videoUrl}
                  videoStartTime={videoStartTime}
                  poseData={poseData}
                  poseSrcExtent={poseSrcExtent}
                  displayedClips={displayedClips}
                  color={selectedColor}
                  featureName={
                    featureScale ? (featureColumn ?? undefined) : undefined
                  }
                  offsetSec={offsetSec}
                  padSec={padSec}
                  playing={playing}
                  showPose={showPose}
                  showEdges={showEdges}
                  showTrails={showTrails}
                  trailSec={trailSec}
                  resetSignal={resetSignal}
                  cols={cols}
                />
              </div>
              <BoutsTimeline
                width={montageW}
                height={bottomH}
                labels={data.labels}
                bouts={filteredBouts}
                domStart={domain.domStart}
                domEnd={domain.domEnd}
                selectedLabelId={selectedLabelId}
                clipMarks={clipMarks}
                valueColumn={featureColumn}
                observed={observed}
              />
            </div>
          </div>
        </>
      )}

      {/* No video and no pose (e.g. mlost): the distribution map is the whole view. */}
      {!canMontage && (
        <BoutsDistributionStrip
          width={width}
          height={height - HEADER_H}
          labels={visibleLabels}
          bouts={filteredBouts}
          domStart={domain.domStart}
          domEnd={domain.domEnd}
          selectedLabelId={selectedLabelId}
          onSelectLabel={setSelectedLabelId}
          observed={observed}
          showAxis
        />
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "1px 6px 1px 0",
  borderBottom: "1px solid #eee",
  color: "#888",
  fontWeight: 600,
  position: "sticky",
  top: 0,
  background: "#fff",
};
const tdStyle: React.CSSProperties = {
  padding: "1px 6px 1px 0",
  fontVariantNumeric: "tabular-nums",
};

// Format an extra-column cell: numbers to 1 decimal (NaN -> em dash), text as-is.
const fmtCell = (v: number | string | undefined): string =>
  v === undefined
    ? ""
    : typeof v === "number"
      ? Number.isFinite(v)
        ? v.toFixed(1)
        : "—"
      : String(v);

const SectionTitle: FunctionComponent<{
  text: string;
  info?: string;
  small?: boolean;
}> = ({ text, info, small }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 3,
      fontSize: small ? 10 : 12,
      fontWeight: small ? 400 : 700,
      color: small ? "#999" : "#666",
      marginBottom: 2,
    }}
  >
    {text}
    {info && (
      <Tooltip title={<span style={{ whiteSpace: "pre-line" }}>{info}</span>}>
        <InfoOutlinedIcon
          sx={{ fontSize: 13, color: "#bbb", cursor: "help" }}
        />
      </Tooltip>
    )}
  </div>
);

const NumInput: FunctionComponent<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  width?: number;
}> = ({ label, value, onChange, min, max, step, width = 52 }) => (
  <label style={{ whiteSpace: "nowrap" }}>
    {label}{" "}
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (!Number.isFinite(v)) return;
        let next = v;
        if (min !== undefined) next = Math.max(min, next);
        if (max !== undefined) next = Math.min(max, next);
        onChange(next);
      }}
      style={{ width }}
    />
  </label>
);

const Chip: FunctionComponent<{ text: string; muted?: boolean }> = ({
  text,
  muted,
}) => (
  <span
    style={{
      fontSize: 11,
      padding: "1px 7px",
      borderRadius: 10,
      background: muted ? "#eee" : "#eef3fb",
      color: muted ? "#777" : "#2c5aa0",
      border: `1px solid ${muted ? "#ddd" : "#cfe0f5"}`,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </span>
);

export default BehavioralBoutsView;
