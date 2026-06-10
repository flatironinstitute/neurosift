import {
  getHdf5DatasetData,
  getHdf5Group,
  Hdf5Subdataset,
} from "@hdf5Interface";
import { VIDEO_DISCOVERY_ROOTS } from "../../externalVideoUtils";

// One body part's track: keypoint coordinates in ORIGINAL VIDEO PIXEL space
// (ndx-pose reference_frame is the top-left of the video), plus the session-time
// stamp of each frame so the overlay can be indexed by the video's clock.
export type PoseKeypoint = {
  name: string;
  color: string;
  // Flat row-major [x0, y0, x1, y1, ...]; one (x, y) pair per frame.
  coords: Float32Array;
  // Session time (seconds) per frame; same length as coords / 2.
  timestamps: Float64Array;
};

export type PoseData = {
  keypoints: PoseKeypoint[];
};

// ndx-pose carries no per-keypoint color, so spread hues evenly over a stable
// (discovery-order) index, mirroring the motif color scheme.
const keypointColor = (index: number, total: number): string => {
  const hue = (index * 360) / Math.max(total, 1);
  return `hsl(${hue.toFixed(1)}, 85%, 55%)`;
};

// Find the PoseEstimation group VAME was built from. Spec-conformant ndx-vame
// files reach it through the VAMEProject's `pose_estimation` link; we also fall
// back to a scan of the usual data roots so a standalone PoseEstimation still
// resolves.
const findPoseEstimationGroup = async (
  nwbUrl: string,
  vameProjectPath: string,
): Promise<string | null> => {
  const project = await getHdf5Group(nwbUrl, vameProjectPath);
  const linked = project?.subgroups.find(
    (sg) =>
      sg.name === "pose_estimation" ||
      sg.attrs?.neurodata_type === "PoseEstimation",
  );
  if (linked) return linked.path;

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

// Read a series' per-frame session times: explicit `timestamps` if present, else
// synthesized from `starting_time` + `rate`.
const loadTimestamps = async (
  nwbUrl: string,
  seriesPath: string,
  datasets: Hdf5Subdataset[],
  numFrames: number,
): Promise<Float64Array | null> => {
  if (datasets.some((d) => d.name === "timestamps")) {
    const ts = await getHdf5DatasetData(nwbUrl, `${seriesPath}/timestamps`, {});
    if (ts) return Float64Array.from(ts as ArrayLike<number>, Number);
  }
  const st = datasets.find((d) => d.name === "starting_time");
  if (st) {
    const value = await getHdf5DatasetData(
      nwbUrl,
      `${seriesPath}/starting_time`,
      {},
    );
    const rate = Number(st.attrs?.rate || 0);
    if (value !== undefined && rate > 0) {
      const start = Number(value);
      const out = new Float64Array(numFrames);
      for (let i = 0; i < numFrames; i++) out[i] = start + i / rate;
      return out;
    }
  }
  return null;
};

// Load every PoseEstimationSeries the VAME project links to, keeping only the
// (x, y) columns (a 3rd confidence column, if present, is dropped for the PoC).
export const loadVamePoseData = async (
  nwbUrl: string,
  vameProjectPath: string,
): Promise<PoseData | null> => {
  const posePath = await findPoseEstimationGroup(nwbUrl, vameProjectPath);
  if (!posePath) return null;
  const poseGroup = await getHdf5Group(nwbUrl, posePath);
  if (!poseGroup) return null;

  const seriesSubs = poseGroup.subgroups.filter(
    (sg) => sg.attrs?.neurodata_type === "PoseEstimationSeries",
  );
  if (seriesSubs.length === 0) return null;

  const keypoints: PoseKeypoint[] = [];
  for (let i = 0; i < seriesSubs.length; i++) {
    const sg = seriesSubs[i];
    const g = await getHdf5Group(nwbUrl, sg.path);
    if (!g) continue;
    const dataDs = g.datasets.find((d) => d.name === "data");
    if (!dataDs || dataDs.shape.length !== 2 || dataDs.shape[1] < 2) continue;
    const numFrames = dataDs.shape[0];
    const stride = dataDs.shape[1];

    const raw = await getHdf5DatasetData(nwbUrl, `${sg.path}/data`, {});
    if (!raw) continue;
    const coords = new Float32Array(numFrames * 2);
    for (let f = 0; f < numFrames; f++) {
      coords[f * 2] = Number(raw[f * stride]);
      coords[f * 2 + 1] = Number(raw[f * stride + 1]);
    }

    const timestamps = await loadTimestamps(
      nwbUrl,
      sg.path,
      g.datasets,
      numFrames,
    );
    if (!timestamps) continue;

    keypoints.push({
      name: sg.name,
      color: keypointColor(i, seriesSubs.length),
      coords,
      timestamps,
    });
  }
  if (keypoints.length === 0) return null;
  return { keypoints };
};

// First frame index whose timestamp is >= t (binary search; clamps to range).
const frameIndexAtTime = (timestamps: Float64Array, t: number): number => {
  if (timestamps.length === 0) return 0;
  let lo = 0;
  let hi = timestamps.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (timestamps[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

// Draw the keypoints for `sessionTime` onto a square overlay canvas sized to the
// tile. Maps video-pixel coordinates through the same object-fit:contain box the
// <video> uses; the canvas shares the tile's pan/zoom transform via CSS, so this
// only has to handle the un-zoomed contain mapping.
export const drawPoseFrame = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  poseData: PoseData,
  sessionTime: number,
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const size = canvas.width;
  const scale = Math.min(size / vw, size / vh);
  const offX = (size - vw * scale) / 2;
  const offY = (size - vh * scale) / 2;
  const r = Math.max(3, size / 110);

  for (const kp of poseData.keypoints) {
    const f = frameIndexAtTime(kp.timestamps, sessionTime);
    const x = kp.coords[f * 2];
    const y = kp.coords[f * 2 + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    ctx.beginPath();
    ctx.arc(offX + x * scale, offY + y * scale, r, 0, 2 * Math.PI);
    ctx.fillStyle = kp.color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#000";
    ctx.stroke();
  }
};
