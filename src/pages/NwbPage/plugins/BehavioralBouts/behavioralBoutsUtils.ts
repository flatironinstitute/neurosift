import { getHdf5DatasetData, getHdf5Group, Hdf5Group } from "@hdf5Interface";
import { VIDEO_DISCOVERY_ROOTS } from "../../externalVideoUtils";

// One labeled behavioral bout: a span in session seconds with a label id and,
// when the table carries the optional `label` text column, a human-readable name.
// `extra` holds any other per-row columns the table carries (e.g. the kinematic
// mean_speed / peak_speed / distance enrichment), keyed by column name.
export type Bout = {
  startTime: number;
  stopTime: number;
  labelId: number;
  label?: string;
  extra?: Record<string, number | string>;
};

// A distinct behavior row in the ethogram: its label id, display name, and color.
export type BoutLabel = {
  labelId: number;
  name: string;
  color: string;
};

// A bout currently shown as a montage clip, marked on the timeline with a letter.
// `extra` carries its per-row columns so the timeline can print value lines under
// the letter without a second lookup.
export type ClipMark = {
  startTime: number;
  stopTime: number;
  labelId: number;
  letter: string;
  extra?: Record<string, number | string>;
};

// Everything the view needs from a BehavioralBouts group.
export type BehavioralBoutsData = {
  bouts: Bout[];
  labels: BoutLabel[];
  // Group attributes (always present: labeling_method; others optional).
  labelingMethod?: string;
  sourceSoftware?: string;
  annotator?: string;
  // Extra per-row column names (beyond the structural ones), in table order.
  extraColumns: string[];
};

// A span that was actually annotated; outside these spans the labels say nothing.
export type ObservationInterval = { start: number; stop: number };

const readNumberColumn = async (
  nwbUrl: string,
  path: string,
  n: number,
): Promise<number[]> => {
  if (n <= 0) return [];
  const d = await getHdf5DatasetData(nwbUrl, path, { slice: [[0, n]] });
  if (!d) return [];
  return Array.from(d as ArrayLike<unknown>).map((v) => Number(v));
};

const readStringColumn = async (
  nwbUrl: string,
  path: string,
  n: number,
): Promise<string[]> => {
  if (n <= 0) return [];
  const d = await getHdf5DatasetData(nwbUrl, path, { slice: [[0, n]] });
  if (!d) return [];
  return Array.from(d as ArrayLike<unknown>).map((v) =>
    v instanceof Uint8Array ? new TextDecoder().decode(v) : String(v),
  );
};

const isStringDtype = (dtype: string | undefined): boolean => {
  if (!dtype) return false;
  const d = dtype.toLowerCase();
  return (
    d.includes("str") ||
    d.includes("object") ||
    d === "|o" ||
    /^[|<>]?[su]\d/.test(d)
  );
};

const attrString = (group: Hdf5Group, key: string): string | undefined => {
  const v = group.attrs?.[key];
  if (v === undefined || v === null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  if (s === undefined || s === null) return undefined;
  const text = String(s).trim();
  return text === "" || text === "None" ? undefined : text;
};

// A categorical color per label id. Hues are spread evenly across the distinct
// ids (sorted, so the mapping is stable) and lightness alternates so adjacent
// hues stay distinguishable even with many behaviors.
export const buildBoutColorMap = (labelIds: number[]): Map<number, string> => {
  const sorted = [...new Set(labelIds)].sort((a, b) => a - b);
  const colorMap = new Map<number, string>();
  sorted.forEach((id, index) => {
    const hue = (index * 360) / Math.max(sorted.length, 1);
    const lightness = index % 2 === 0 ? 55 : 42;
    colorMap.set(id, `hsl(${hue.toFixed(1)}, 68%, ${lightness}%)`);
  });
  return colorMap;
};

// ----- Feature (kinematic-column) coloring + sorting -----

// A value mapping over one numeric extra column, used to sort the montage clips
// and the per-bout table and to fill each tile's magnitude gauge. Color is NOT
// part of this: color stays reserved for behavior identity, so the feature is
// shown by sort order, a number, and a bar gauge instead.
export type FeatureScale = {
  column: string;
  // Raw numeric value of the column for a bout, or null when missing / NaN.
  value: (b: Bout) => number | null;
  // value clipped to the 5th-95th percentile and mapped to 0..1 (null when value
  // is null). Clipping keeps a single outlier from washing out the gauge scale.
  norm: (b: Bout) => number | null;
  // The clipped range, for a tooltip / readout.
  lo: number;
  hi: number;
};

// The numeric value of an extra column for a bout, or null when absent / NaN.
const extraNumber = (b: Bout, column: string): number | null => {
  const v = b.extra?.[column];
  if (v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

// Which extra columns are numeric (most sampled values parse as finite numbers),
// so the picker offers only sortable/colorable columns. extraColumns already
// excludes the structural start/stop/label.
export const numericExtraColumns = (
  bouts: Bout[],
  extraColumns: string[],
): string[] =>
  extraColumns.filter((col) => {
    let finite = 0;
    let total = 0;
    for (const b of bouts) {
      const v = b.extra?.[col];
      if (v === undefined || v === null) continue;
      total += 1;
      if (Number.isFinite(typeof v === "number" ? v : Number(v))) finite += 1;
      if (total >= 60) break;
    }
    return total > 0 && finite / total >= 0.5;
  });

// Build a FeatureScale over a set of bouts (typically the selected behavior's, so
// the gradient spans that behavior's range). Returns null when no bout has a
// finite value for the column.
export const buildFeatureScale = (
  bouts: Bout[],
  column: string,
): FeatureScale | null => {
  const value = (b: Bout) => extraNumber(b, column);
  const vals = bouts
    .map(value)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  if (vals.length === 0) return null;
  const pct = (p: number) =>
    vals[Math.max(0, Math.min(vals.length - 1, Math.round(p * (vals.length - 1))))];
  let lo = pct(0.05);
  let hi = pct(0.95);
  if (hi <= lo) {
    lo = vals[0];
    hi = vals[vals.length - 1];
  }
  const span = hi - lo;
  const norm = (b: Bout): number | null => {
    const v = value(b);
    if (v === null) return null;
    if (span <= 0) return 0.5;
    return Math.max(0, Math.min(1, (v - lo) / span));
  };
  return { column, value, norm, lo, hi };
};

// Compact numeric formatting for the feature value (tile sub-label + legend).
export const formatFeatureValue = (v: number | null): string => {
  if (v === null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 1) return v.toFixed(1);
  return v.toFixed(2);
};

// Compare two bouts by a feature value in a direction, NaN/missing always last.
export const compareByFeature = (
  scale: FeatureScale,
  dir: "asc" | "desc",
): ((a: Bout, b: Bout) => number) => {
  return (a, b) => {
    const av = scale.value(a);
    const bv = scale.value(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return dir === "desc" ? bv - av : av - bv;
  };
};

// Order distinct label strings sensibly: numerically when they are all numeric
// (unsupervised cluster ids like "7"), lexically otherwise (behavior names).
const compareLabels = (a: string, b: string): number => {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b);
};

// Read the bout rows (start_time, stop_time, label) and build the distinct-label
// rows with colors. `label` is a single required text column: a behavior name, or
// the tool's own cluster id as text (e.g. "7") for unsupervised output. The widget
// keys internally on a numeric id, so each distinct label string is assigned a
// stable synthetic index here; the label string itself is the display name.
export const loadBehavioralBouts = async (
  nwbUrl: string,
  path: string,
  group: Hdf5Group,
): Promise<BehavioralBoutsData> => {
  const startDs = group.datasets.find((ds) => ds.name === "start_time");
  const n = startDs?.shape?.[0] ?? 0;

  // Any per-row column beyond the structural ones (e.g. the kinematic
  // mean_speed / peak_speed / path_length enrichment), in table (colnames) order.
  const structural = new Set(["start_time", "stop_time", "label"]);
  const colnames: string[] = Array.isArray(group.attrs?.colnames)
    ? group.attrs.colnames.map((c: unknown) => String(c))
    : [];
  const extraColumns = colnames.filter(
    (c) => !structural.has(c) && group.datasets.some((ds) => ds.name === c),
  );

  const [startTimes, stopTimes, labelTexts] = await Promise.all([
    readNumberColumn(nwbUrl, `${path}/start_time`, n),
    readNumberColumn(nwbUrl, `${path}/stop_time`, n),
    readStringColumn(nwbUrl, `${path}/label`, n),
  ]);

  const extraData: Record<string, (number | string)[]> = {};
  await Promise.all(
    extraColumns.map(async (col) => {
      const ds = group.datasets.find((d) => d.name === col);
      extraData[col] = isStringDtype(ds?.dtype)
        ? await readStringColumn(nwbUrl, `${path}/${col}`, n)
        : await readNumberColumn(nwbUrl, `${path}/${col}`, n);
    }),
  );

  // Map each distinct label string to a stable synthetic numeric id (sorted order),
  // so the rest of the widget can keep keying on a number while `label` stays text.
  const distinctLabels = [...new Set(labelTexts)].sort(compareLabels);
  const idByName = new Map<string, number>();
  distinctLabels.forEach((label, index) => idByName.set(label, index));

  const bouts: Bout[] = [];
  for (let i = 0; i < n; i++) {
    const label = labelTexts[i];
    const labelId = idByName.get(label) ?? 0;
    let extra: Record<string, number | string> | undefined;
    if (extraColumns.length) {
      extra = {};
      for (const col of extraColumns) extra[col] = extraData[col]?.[i];
    }
    bouts.push({
      startTime: startTimes[i],
      stopTime: stopTimes[i],
      labelId,
      label,
      extra,
    });
  }

  const distinctIds = distinctLabels.map((_, index) => index);
  const colorMap = buildBoutColorMap(distinctIds);
  const labels: BoutLabel[] = distinctLabels.map((label, index) => ({
    labelId: index,
    name: label,
    color: colorMap.get(index) ?? "#888",
  }));

  return {
    bouts,
    labels,
    labelingMethod: attrString(group, "labeling_method"),
    sourceSoftware: attrString(group, "source_software"),
    annotator: attrString(group, "annotator"),
    extraColumns,
  };
};

// Walk the usual data roots and return the path of the first external-file
// ImageSeries. Used as a fallback when the bouts group has no source_video link.
const findFirstExternalVideo = async (
  nwbUrl: string,
): Promise<string | null> => {
  const visit = async (path: string): Promise<string | null> => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return null;
    if (
      group.attrs?.neurodata_type === "ImageSeries" &&
      group.datasets.some((ds) => ds.name === "external_file")
    ) {
      return group.path;
    }
    for (const subgroup of group.subgroups || []) {
      const found = await visit(subgroup.path);
      if (found) return found;
    }
    return null;
  };
  for (const root of VIDEO_DISCOVERY_ROOTS) {
    const found = await visit(root);
    if (found) return found;
  }
  return null;
};

// Resolve the ImageSeries path the bouts align to. Prefers the source_video soft
// link (HDF5 follows the link transparently when reading through its path); if
// the link is absent or does not point at an external-file ImageSeries, falls
// back to discovering the first external-file video in the file. Returns null
// when the file has no video at all (e.g. vame, mlost).
export const resolveSourceVideoSeriesPath = async (
  nwbUrl: string,
  group: Hdf5Group,
): Promise<string | null> => {
  const link = group.subgroups.find((sg) => sg.name === "source_video");
  if (link) {
    const linked = await getHdf5Group(nwbUrl, link.path);
    if (linked && linked.datasets.some((ds) => ds.name === "external_file")) {
      return link.path;
    }
  }
  return findFirstExternalVideo(nwbUrl);
};

// Read the observation_intervals soft link (a plain TimeIntervals) into a list
// of observed spans, or null when the bouts group has no such link (most files).
export const loadObservationIntervals = async (
  nwbUrl: string,
  group: Hdf5Group,
): Promise<ObservationInterval[] | null> => {
  const link = group.subgroups.find(
    (sg) => sg.name === "observation_intervals",
  );
  if (!link) return null;
  const obsGroup = await getHdf5Group(nwbUrl, link.path);
  if (!obsGroup) return null;
  const startDs = obsGroup.datasets.find((ds) => ds.name === "start_time");
  const stopDs = obsGroup.datasets.find((ds) => ds.name === "stop_time");
  if (!startDs || !stopDs) return null;
  const n = startDs.shape?.[0] ?? 0;
  const [starts, stops] = await Promise.all([
    readNumberColumn(nwbUrl, `${link.path}/start_time`, n),
    readNumberColumn(nwbUrl, `${link.path}/stop_time`, n),
  ]);
  return starts.map((start, i) => ({ start, stop: stops[i] }));
};

// Per-clip label: A, B, C, ... then a numeric fallback past Z.
export const clipLabel = (index: number): string =>
  index < 26 ? String.fromCharCode(65 + index) : `#${index + 1}`;

// Deterministic Fisher-Yates shuffle (linear-congruential PRNG) so a given seed
// always yields the same pick; "Resample" just advances the seed.
export const seededShuffle = <T>(items: T[], seed: number): T[] => {
  const a = items.slice();
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ----- Shared timeline visual grammar -----
// Both timeline strips share one legend: solid color = whatever the strip puts
// in focus, alpha 0.15 = the de-emphasis level for other-behavior context, and a
// dedicated near-black COVERAGE TRACK marks the `observation_intervals`
// ("observed") spans (gaps = not observed). The track is its own line rather than
// a background shading so the bouts keep a clean (white) backdrop and read
// clearly. The two strips differ only in PURPOSE: the bottom BoutsTimeline is a
// category-focus view, the sidebar BoutsDistributionStrip is a session overview.

// The de-emphasis opacity for anything not in focus (other-behavior context).
export const DEEMPHASIS_ALPHA = 0.15;

// Near-black for the "observed" coverage-track segments.
export const OBSERVED_INK = "#1a1a1a";

// Draw the coverage track into [0, trackWidth] x [y, y+h]: a faint full-width
// background (so the not-observed part reads as an empty track) with near-black
// segments over the observed spans. No inline label (it would shift the track out
// of alignment with the bouts); the legend lives in the behavior selector as an
// "observed" row. timeToX maps session time to the same x the strip's bouts use.
export const drawObservedTrack = (
  ctx: CanvasRenderingContext2D,
  observed: ObservationInterval[],
  timeToX: (t: number) => number,
  trackWidth: number,
  y: number,
  h: number,
): void => {
  if (h <= 0) return;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fillRect(0, y, trackWidth, h);
  ctx.fillStyle = OBSERVED_INK;
  for (const o of observed) {
    const x = Math.max(0, timeToX(o.start));
    const w = Math.min(trackWidth, timeToX(o.stop)) - x;
    if (w > 0) ctx.fillRect(x, y, Math.max(1, w), h);
  }
  ctx.restore();
};

// mm:ss formatting for the time axis and readouts.
export const formatTime = (seconds: number): string => {
  if (!isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

// Pose overlay is delegated to the full PoseEstimation widget (composed in the
// view); here we only need to locate the PoseEstimation group the bouts link to.

const findFirstPoseEstimation = async (
  nwbUrl: string,
): Promise<string | null> => {
  const visit = async (path: string): Promise<string | null> => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return null;
    if (group.attrs?.neurodata_type === "PoseEstimation") return group.path;
    for (const subgroup of group.subgroups || []) {
      const found = await visit(subgroup.path);
      if (found) return found;
    }
    return null;
  };
  for (const root of VIDEO_DISCOVERY_ROOTS) {
    const found = await visit(root);
    if (found) return found;
  }
  return null;
};

// Resolve the PoseEstimation group the bouts align to: the source_pose soft link
// if it points at one, else a discovery scan. Returns null when there is no pose.
export const resolveSourcePosePath = async (
  nwbUrl: string,
  group: Hdf5Group,
): Promise<string | null> => {
  const link = group.subgroups.find((sg) => sg.name === "source_pose");
  if (link) {
    const linked = await getHdf5Group(nwbUrl, link.path);
    if (
      linked &&
      linked.subgroups.some(
        (sg) => sg.attrs?.neurodata_type === "PoseEstimationSeries",
      )
    ) {
      return link.path;
    }
  }
  return findFirstPoseEstimation(nwbUrl);
};
