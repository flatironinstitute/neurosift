import { getHdf5DatasetData, getHdf5Group } from "@hdf5Interface";
import { VIDEO_DISCOVERY_ROOTS } from "../../externalVideoUtils";

// One contiguous run of a single motif label, in both frame indices and seconds.
// stopFrame is the inclusive last frame; stopTime is the exclusive end (the time
// of the frame just past the run), so stopTime - startTime is the bout duration.
export type MotifBout = {
  motif: number;
  startFrame: number;
  stopFrame: number;
  startTime: number;
  stopTime: number;
};

// What we need from the per-frame MotifSeries to place its labels on the clock.
export type MotifSeriesInfo = {
  path: string;
  startingTime: number;
  rate: number;
  numFrames: number;
};

// Locate the MotifSeries subgroup inside an ndx-vame VAMEProject group and read
// its timing (starting_time + rate) and length. Returns null if the project has
// no MotifSeries (e.g. a latent-only export).
export const findMotifSeries = async (
  nwbUrl: string,
  vameProjectPath: string,
): Promise<MotifSeriesInfo | null> => {
  const group = await getHdf5Group(nwbUrl, vameProjectPath);
  if (!group) return null;

  const motifSub = group.subgroups.find(
    (sg) => sg.attrs?.neurodata_type === "MotifSeries",
  );
  if (!motifSub) return null;

  const motifGroup = await getHdf5Group(nwbUrl, motifSub.path);
  if (!motifGroup) return null;

  const dataDataset = motifGroup.datasets.find((ds) => ds.name === "data");
  if (!dataDataset) return null;
  const numFrames = dataDataset.shape[0] || 0;

  let startingTime = 0;
  let rate = 0;
  const startingTimeDataset = motifGroup.datasets.find(
    (ds) => ds.name === "starting_time",
  );
  if (startingTimeDataset) {
    const value = await getHdf5DatasetData(
      nwbUrl,
      startingTimeDataset.path,
      {},
    );
    startingTime = Number(value);
    rate = Number(startingTimeDataset.attrs?.rate || 0);
  }

  return { path: motifSub.path, startingTime, rate, numFrames };
};

// Collapse the per-frame label array into bouts (run-length encoding). O(n) in
// the number of frames; the number of bouts, not frames, bounds downstream draw.
export const runLengthEncodeMotifs = (
  data: ArrayLike<number>,
  info: MotifSeriesInfo,
): MotifBout[] => {
  const bouts: MotifBout[] = [];
  const n = data.length;
  if (n === 0) return bouts;

  const rate = info.rate || 1;
  const frameToTime = (frame: number) => info.startingTime + frame / rate;

  let runStart = 0;
  let runMotif = data[0];
  for (let i = 1; i <= n; i++) {
    if (i === n || data[i] !== runMotif) {
      bouts.push({
        motif: runMotif,
        startFrame: runStart,
        stopFrame: i - 1,
        startTime: frameToTime(runStart),
        stopTime: frameToTime(i),
      });
      if (i < n) {
        runStart = i;
        runMotif = data[i];
      }
    }
  }
  return bouts;
};

// A categorical color per motif. Hues are spread evenly across the distinct
// motifs (sorted, so the mapping is stable) and lightness alternates so that
// adjacent hues stay distinguishable even with many motifs.
export const buildMotifColorMap = (motifs: number[]): Map<number, string> => {
  const sorted = [...motifs].sort((a, b) => a - b);
  const colorMap = new Map<number, string>();
  sorted.forEach((motif, index) => {
    const hue = (index * 360) / Math.max(sorted.length, 1);
    const lightness = index % 2 === 0 ? 58 : 44;
    colorMap.set(motif, `hsl(${hue.toFixed(1)}, 70%, ${lightness}%)`);
  });
  return colorMap;
};

// Walk the usual data roots and return the path of the first external-file
// ImageSeries (the behavioral video the montage crops). Mirrors hasExternalVideos
// in externalVideoUtils but returns the path instead of a boolean.
export const findBehavioralVideoSeries = async (
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

// mm:ss formatting for clip labels and the legend.
export const formatTime = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

// Per-clip label: A, B, C, ... then a numeric fallback past Z.
export const clipLabel = (index: number): string =>
  index < 26 ? String.fromCharCode(65 + index) : `#${index + 1}`;

// Deterministic Fisher-Yates shuffle (linear-congruential PRNG) so a given seed
// always yields the same pick; the Resample button just advances the seed.
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
