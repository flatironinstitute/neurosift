import { getHdf5Group } from "@hdf5Interface";
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
  ClipMark,
  clipLabel,
  formatTime,
  loadBehavioralBouts,
  loadObservationIntervals,
  ObservationInterval,
  resolveSourcePosePath,
  resolveSourceVideoSeriesPath,
  seededShuffle,
} from "./behavioralBoutsUtils";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
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
  const [seed, setSeed] = useState(() => num("bbSeed", 1));
  const [playing, setPlaying] = useState(true);
  const [showPose, setShowPose] = useState(() => bool("bbPose", true));
  const [showEdges, setShowEdges] = useState(() => bool("bbEdges", true));
  const [showTrails, setShowTrails] = useState(() => bool("bbTrails", false));
  const [trailSec, setTrailSec] = useState(() => num("bbTrailSec", 1));
  const [resetSignal, setResetSignal] = useState(0);
  // Guards the one-shot skeleton default (on for pose-only, off when a video).
  const edgesAutoRef = useRef(false);

  // ----- Load bouts + links -----
  useEffect(() => {
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
            const url = await resolveExternalVideoUrl(
              nwbUrl,
              seriesPath,
              searchParams.get("dandisetId"),
              searchParams.get("dandisetVersion") || "draft",
            );
            if (!canceled) {
              setVideoStartTime(range.startTime || 0);
              setVideoUrl(url);
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
  }, [nwbUrl, path, searchParams]);

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
    const picked = seededShuffle(sel, seed).slice(0, clipCount);
    picked.sort((a, b) => a.startTime - b.startTime);
    return picked.map((bout, index) => ({ bout, label: clipLabel(index) }));
  }, [data, selectedLabelId, minBoutMs, seed, clipCount]);

  const clipMarks: ClipMark[] = useMemo(
    () =>
      displayedClips.map((c) => ({
        startTime: c.bout.startTime,
        labelId: c.bout.labelId,
        letter: c.label,
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
    const bouts = filteredBouts
      .filter((b) => b.labelId === selectedLabelId)
      .sort((a, b) => a.startTime - b.startTime);
    if (!bouts.length) return null;
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
      bouts,
      count: bouts.length,
      total,
      min,
      max,
      mean: total / bouts.length,
      pct: sessionDur ? (total / sessionDur) * 100 : 0,
    };
  }, [filteredBouts, selectedLabelId, sessionDur]);

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
    sync("bbPose", "0", showPose);
    sync("bbEdges", "0", showEdges);
    sync("bbTrails", "1", !showTrails);
    sync("bbTrailSec", String(trailSec), trailSec === 1);
    window.history.replaceState(null, "", url.toString());
  }, [
    selectedLabelId,
    clipCount,
    seed,
    minBoutMs,
    padSec,
    showPose,
    showEdges,
    showTrails,
    trailSec,
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

  const title = path.split("/").pop() || path;
  const cols = Math.max(1, Math.ceil(Math.sqrt(clipCount)));
  const selectedLabel =
    selectedLabelId === null
      ? undefined
      : data.labels.find((l) => l.labelId === selectedLabelId);
  const selectedColor = selectedLabel?.color || "#888";
  const selectedBoutCount = selectedStats?.count || 0;

  const bottomH = canMontage ? clamp(Math.round(height * 0.17), 80, 130) : 0;

  const visibleLabels = data.labels
    .filter((l) => (summary.get(l.labelId)?.count || 0) > 0)
    .sort((a, b) => meanDur(b.labelId) - meanDur(a.labelId));

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
            <button
              onClick={() => setSeed((s) => s + 1)}
              style={{ cursor: "pointer", padding: "1px 8px" }}
              title="New random set of example bouts"
            >
              Resample
            </button>
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
                <SectionTitle text="Summary" info={summaryInfo} />
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
                        title="bouts · mean duration"
                      >
                        {summary.get(l.labelId)?.count || 0} ·{" "}
                        {meanDur(l.labelId).toFixed(1)}s
                      </span>
                    </button>
                  );
                })}
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
                    id {selectedLabel.labelId} · {selectedStats.count} bouts ·{" "}
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
                          <th style={thStyle}>start</th>
                          <th style={thStyle}>dur (s)</th>
                          {data.extraColumns.map((c) => (
                            <th key={c} style={thStyle}>
                              {c}
                            </th>
                          ))}
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
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <BehavioralBoutsMontage
                hasVideo={hasVideo}
                videoUrl={videoUrl}
                videoStartTime={videoStartTime}
                poseData={poseData}
                poseSrcExtent={poseSrcExtent}
                displayedClips={displayedClips}
                color={selectedColor}
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
          </div>

          <BoutsTimeline
            width={width}
            height={bottomH}
            labels={data.labels}
            bouts={filteredBouts}
            domStart={domain.domStart}
            domEnd={domain.domEnd}
            selectedLabelId={selectedLabelId}
            clipMarks={clipMarks}
          />
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
