import { getHdf5DatasetData } from "@hdf5Interface";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getSeriesTimeRange } from "../../externalVideoUtils";
import EthogramRaster from "./EthogramRaster";
import MotifMontage from "./MotifMontage";
import {
  buildMotifColorMap,
  clipLabel,
  findBehavioralVideoSeries,
  findMotifSeries,
  MotifBout,
  MotifSeriesInfo,
  runLengthEncodeMotifs,
  seededShuffle,
} from "./vameUtils";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
};

type LoadedState = {
  bouts: MotifBout[];
  colorMap: Map<number, string>;
  info: MotifSeriesInfo;
};

type VideoState = {
  path: string;
  startTime: number;
};

// Default 2x2 (4 tiles); the cap of 16 stays well under Chromium's
// 75-media-element-per-frame limit, and the tiles all share one mp4 byte cache.
const MAX_CLIPS = 16;
const DEFAULT_CLIPS = 4;
const ETHOGRAM_HEIGHT = 120;
const SIDEBAR_WIDTH = 180;

const numberInput = (
  label: string,
  value: number,
  onChange: (v: number) => void,
  opts: { min?: number; max?: number; step?: number; width?: number } = {},
) => (
  <label style={{ whiteSpace: "nowrap" }}>
    {label}{" "}
    <input
      type="number"
      min={opts.min}
      max={opts.max}
      step={opts.step}
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (!Number.isFinite(v)) return;
        let next = v;
        if (opts.min !== undefined) next = Math.max(opts.min, next);
        if (opts.max !== undefined) next = Math.min(opts.max, next);
        onChange(next);
      }}
      style={{ width: opts.width ?? 56 }}
    />
  </label>
);

// Top-level VAME view. Loads the per-frame MotifSeries, run-length-encodes it into
// bouts in the browser (no NWB change needed), and lays out three linked regions:
// a motif-selection sidebar, the per-behavior video-clip montage, and the ethogram
// raster along the bottom. Keyed on the ndx-vame VAMEProject group.
const VAMEView: FunctionComponent<Props> = ({
  width = 800,
  height = 600,
  nwbUrl,
  path,
}) => {
  const [searchParams] = useSearchParams();
  // Read a numeric URL param once at mount (used to seed the controls below).
  const numParam = (key: string, def: number) => {
    const v = searchParams.get(key);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : def;
  };

  const [state, setState] = useState<LoadedState>();
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const [error, setError] = useState<string>();

  // These controls define the montage and persist in the URL (see the write
  // effect below) so a link reproduces the same view; each is seeded from the URL.
  const [selectedMotif, setSelectedMotif] = useState<number | null>(() => {
    const v = searchParams.get("vameMotif");
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  });
  const [clipCount, setClipCount] = useState(() =>
    numParam("vameTiles", DEFAULT_CLIPS),
  );
  // Bouts shorter than this are dropped from every view (the VAME labels flicker
  // frame-to-frame, producing many sub-second bouts). Default 1 s; adjustable.
  const [minBoutMs, setMinBoutMs] = useState(() =>
    numParam("vameMinBout", 1000),
  );
  // Alignment of motif labels to the video (0.5 s on the 30 fps OFT data).
  const [offsetSec, setOffsetSec] = useState(() => numParam("vameOffset", 0.5));
  // Context added to each side of a clip's window. Default 0 (clip tight to the
  // bout); raise it to see a margin before/after the behavior.
  const [padSec, setPadSec] = useState(() => numParam("vamePad", 0));
  // Seed for the random clip pick. A fixed initial value makes the first pick
  // deterministic; Resample advances it.
  const [seed, setSeed] = useState(() => numParam("vameSeed", 1));
  // Pan/zoom is per-tile (each clip zooms independently via drag-to-select).
  // Bumping this signal resets every tile's view.
  const [resetSignal, setResetSignal] = useState(0);
  // Play/pause all montage clips at once.
  const [playing, setPlaying] = useState(true);
  // Pose proof-of-concept: overlay the linked PoseEstimation keypoints.
  const [showPose, setShowPose] = useState(true);

  const { initializeTimeseriesSelection } = useTimeseriesSelection();

  // Load the motif labels and derive bouts.
  useEffect(() => {
    let canceled = false;
    setState(undefined);
    setError(undefined);
    // Note: selectedMotif is not reset here so a URL-provided vameMotif survives
    // the initial load; the repair effect below corrects an out-of-range value.
    (async () => {
      try {
        const info = await findMotifSeries(nwbUrl, path);
        if (!info) {
          throw new Error("No MotifSeries found in this VAMEProject.");
        }
        const data = await getHdf5DatasetData(nwbUrl, `${info.path}/data`, {});
        if (!data) {
          throw new Error("Could not load MotifSeries data.");
        }
        const bouts = runLengthEncodeMotifs(data, info);
        const distinctMotifs = Array.from(
          new Set(bouts.map((b) => b.motif)),
        ).sort((a, b) => a - b);
        // Colors keyed on all motifs so they stay stable as the filter changes.
        const colorMap = buildMotifColorMap(distinctMotifs);
        if (canceled) return;
        setState({ bouts, colorMap, info });
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path]);

  // Discover the behavioral video (for the montage) and its start time.
  useEffect(() => {
    let canceled = false;
    setVideoState(null);
    (async () => {
      const videoPath = await findBehavioralVideoSeries(nwbUrl);
      if (!videoPath || canceled) return;
      const range = await getSeriesTimeRange(nwbUrl, videoPath);
      if (canceled) return;
      setVideoState({ path: videoPath, startTime: range.startTime });
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl]);

  // Bouts that pass the minimum-length filter, used by every view.
  const filteredBouts = useMemo(() => {
    if (!state) return [];
    const minSec = minBoutMs / 1000;
    return state.bouts.filter((b) => b.stopTime - b.startTime >= minSec);
  }, [state, minBoutMs]);

  // Per-motif bout count, total time, and duration range (after filtering).
  const summary = useMemo(() => {
    const m = new Map<
      number,
      { count: number; total: number; min: number; max: number }
    >();
    for (const b of filteredBouts) {
      const dur = b.stopTime - b.startTime;
      const entry = m.get(b.motif) || {
        count: 0,
        total: 0,
        min: Infinity,
        max: 0,
      };
      entry.count += 1;
      entry.total += dur;
      entry.min = Math.min(entry.min, dur);
      entry.max = Math.max(entry.max, dur);
      m.set(b.motif, entry);
    }
    return m;
  }, [filteredBouts]);

  // Motifs that still have at least one bout after filtering, sorted by mean
  // bout duration (longest typical episodes first).
  const visibleMotifs = useMemo(() => {
    const meanDur = (m: number) => {
      const e = summary.get(m);
      return e && e.count ? e.total / e.count : 0;
    };
    return Array.from(summary.keys()).sort((a, b) => meanDur(b) - meanDur(a));
  }, [summary]);

  // All of the selected motif's bouts (after filtering).
  const selectedBouts = useMemo(
    () =>
      selectedMotif === null
        ? []
        : filteredBouts.filter((b) => b.motif === selectedMotif),
    [filteredBouts, selectedMotif],
  );
  // A random (seeded) subset of clipCount bouts, ordered chronologically so the
  // A, B, C... labels read left-to-right along the ethogram.
  const displayedClips = useMemo(() => {
    const picked = seededShuffle(selectedBouts, seed).slice(0, clipCount);
    picked.sort((a, b) => a.startTime - b.startTime);
    return picked.map((bout, index) => ({ bout, label: clipLabel(index) }));
  }, [selectedBouts, seed, clipCount]);
  const displayedLabels = useMemo(
    () => new Map(displayedClips.map((c) => [c.bout.startFrame, c.label])),
    [displayedClips],
  );

  // Seed the shared clock and default the selection to the longest-total-time motif.
  useEffect(() => {
    if (!state) return;
    const { info } = state;
    const rate = info.rate || 1;
    const startTimeSec = info.startingTime;
    const endTimeSec = info.startingTime + info.numFrames / rate;
    initializeTimeseriesSelection({
      startTimeSec,
      endTimeSec,
      initialVisibleStartTimeSec: startTimeSec,
      initialVisibleEndTimeSec: endTimeSec,
    });
  }, [state, initializeTimeseriesSelection]);

  // Pick (or repair) the selection once motifs are known.
  useEffect(() => {
    if (visibleMotifs.length === 0) return;
    if (selectedMotif === null || !visibleMotifs.includes(selectedMotif)) {
      setSelectedMotif(visibleMotifs[0]);
    }
  }, [visibleMotifs, selectedMotif]);

  // Persist the montage-defining controls in the URL (live, replace-state,
  // defaults omitted) so a link reproduces the same view. Written through
  // window.history against the live URL so it coexists with the tab/url params
  // (which MainWorkspace writes the same way) without a router round-trip.
  useEffect(() => {
    const url = new URL(window.location.href);
    const sync = (key: string, value: string, isDefault: boolean) => {
      if (isDefault) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    };
    sync("vameMotif", String(selectedMotif), selectedMotif === null);
    sync("vameSeed", String(seed), seed === 1);
    sync("vameTiles", String(clipCount), clipCount === DEFAULT_CLIPS);
    sync("vameMinBout", String(minBoutMs), minBoutMs === 1000);
    sync("vameOffset", String(offsetSec), offsetSec === 0.5);
    sync("vamePad", String(padSec), padSec === 0);
    window.history.replaceState(null, "", url.toString());
  }, [selectedMotif, seed, clipCount, minBoutMs, offsetSec, padSec]);

  const cols = Math.max(1, Math.ceil(Math.sqrt(clipCount)));

  if (error) {
    return (
      <div style={{ padding: 20, color: "#a33" }}>
        Unable to render VAME view: {error}
      </div>
    );
  }
  if (!state) {
    return <div style={{ padding: 20 }}>Loading VAME data...</div>;
  }

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Controls bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "6px 10px",
          fontSize: 12,
          borderBottom: "1px solid #eee",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setPlaying((p) => !p)}
          style={{ padding: "4px 12px", cursor: "pointer" }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <strong>Motif {selectedMotif ?? "-"}</strong>
        <span style={{ color: "#666" }}>
          showing {displayedClips.length} of {selectedBouts.length} bouts
        </span>
        {numberInput("tiles:", clipCount, setClipCount, {
          min: 1,
          max: MAX_CLIPS,
          width: 46,
        })}
        <button
          onClick={() => setSeed((s) => s + 1)}
          style={{ cursor: "pointer", padding: "1px 8px" }}
          title="Pick a new random set of example bouts"
        >
          Resample
        </button>
        {numberInput("min bout (ms):", minBoutMs, setMinBoutMs, {
          min: 0,
          step: 10,
          width: 60,
        })}
        {numberInput("offset (s):", offsetSec, setOffsetSec, { step: 0.1 })}
        {numberInput("pad (s):", padSec, setPadSec, { min: 0, step: 0.1 })}
        <button
          onClick={() => setResetSignal((s) => s + 1)}
          style={{ cursor: "pointer", padding: "1px 8px" }}
          title="Reset every tile's zoom (drag a box on a tile to zoom it; double-click a tile to reset just that one)"
        >
          Reset zoom
        </button>
        <label style={{ whiteSpace: "nowrap", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showPose}
            onChange={(e) => setShowPose(e.target.checked)}
          />{" "}
          pose
        </label>
      </div>

      {/* Main: sidebar + montage grid (flex:1 takes the space left between the
          controls bar and the bottom ethogram). */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div
          style={{
            width: SIDEBAR_WIDTH,
            overflowY: "auto",
            borderRight: "1px solid #eee",
            padding: 6,
            flexShrink: 0,
          }}
        >
          {visibleMotifs.map((motif) => {
            const info = summary.get(motif);
            const selected = motif === selectedMotif;
            return (
              <button
                key={motif}
                onClick={() => setSelectedMotif(motif)}
                title={
                  info
                    ? `Motif ${motif}: ${info.count} bouts, ` +
                      `${info.min.toFixed(1)}s to ${info.max.toFixed(1)}s ` +
                      `(mean ${(info.total / info.count).toFixed(1)}s)`
                    : `Motif ${motif}`
                }
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
                    minWidth: 22,
                    height: 18,
                    padding: "0 4px",
                    borderRadius: 3,
                    background: state.colorMap.get(motif),
                    color: "#000",
                    fontWeight: 700,
                    fontSize: 12,
                    lineHeight: "18px",
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {motif}
                </span>
                {info ? (
                  <span style={{ color: "#777", fontSize: 11 }}>
                    {info.count} bouts, {info.min.toFixed(1)}s to{" "}
                    {info.max.toFixed(1)}s
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
          {videoState ? (
            <MotifMontage
              nwbUrl={nwbUrl}
              videoPath={videoState.path}
              vameProjectPath={path}
              displayedClips={displayedClips}
              selectedMotif={selectedMotif}
              color={
                (selectedMotif !== null && state.colorMap.get(selectedMotif)) ||
                "#888"
              }
              videoStartTime={videoState.startTime}
              offsetSec={offsetSec}
              padSec={padSec}
              playing={playing}
              showPose={showPose}
              resetSignal={resetSignal}
              cols={cols}
              dandisetId={searchParams.get("dandisetId")}
              dandisetVersion={searchParams.get("dandisetVersion") || "draft"}
            />
          ) : (
            <div style={{ padding: 12, color: "#666" }}>
              No behavioral video found in this file; showing the ethogram only.
            </div>
          )}
        </div>
      </div>

      {/* Ethogram along the bottom */}
      <div style={{ borderTop: "1px solid #eee" }}>
        <EthogramRaster
          width={width}
          height={ETHOGRAM_HEIGHT}
          bouts={filteredBouts}
          colorMap={state.colorMap}
          selectedMotif={selectedMotif}
          displayedLabels={displayedLabels}
        />
      </div>
    </div>
  );
};

export default VAMEView;
