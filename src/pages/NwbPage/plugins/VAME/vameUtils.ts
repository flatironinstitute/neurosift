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

// Find the PoseEstimation group VAME was built from: the VAMEProject's
// `pose_estimation` link if present, else a scan of the usual data roots. The
// shared loadPoseEstimation then reads it (so VAME uses the same pose machinery).
export const findPoseEstimationPath = async (
  nwbUrl: string,
  vameProjectPath: string,
): Promise<string | null> => {
  const project = await getHdf5Group(nwbUrl, vameProjectPath);
  if (project) {
    const sub = project.subgroups.find(
      (sg) =>
        sg.name === "pose_estimation" ||
        sg.attrs?.neurodata_type === "PoseEstimation",
    );
    if (sub) {
      const g = await getHdf5Group(nwbUrl, sub.path);
      if (
        g &&
        g.subgroups.some(
          (s) => s.attrs?.neurodata_type === "PoseEstimationSeries",
        )
      )
        return sub.path;
    }
  }
  const visit = async (p: string): Promise<string | null> => {
    const g = await getHdf5Group(nwbUrl, p);
    if (!g) return null;
    if (g.attrs?.neurodata_type === "PoseEstimation") return g.path;
    for (const s of g.subgroups || []) {
      const found = await visit(s.path);
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
