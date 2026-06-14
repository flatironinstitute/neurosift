import { getHdf5DatasetData, getHdf5Group } from "@hdf5Interface";
import {
  getSeriesTimeRange,
  normalizeExternalFileValue,
  VIDEO_DISCOVERY_ROOTS,
} from "../../externalVideoUtils";

// One body part's track: keypoint coordinates in ORIGINAL VIDEO PIXEL space
// (ndx-pose reference_frame is the top-left of the video) plus the session-time
// stamp of each frame, so the overlay can be indexed by the video's clock.
export type PoseKeypoint = {
  name: string;
  color: string;
  // Flat row-major [x0, y0, x1, y1, ...]; one (x, y) pair per frame.
  coords: Float32Array;
  // Session time (seconds) per frame; length === coords.length / 2.
  timestamps: Float64Array;
};

export type PoseData = {
  keypoints: PoseKeypoint[];
  // From the PoseEstimation container, both optional and often unreliable: the
  // source video filenames, and each source video's [height, width] in pixels.
  originalVideos: string[];
  dimensions: number[][];
  // Skeleton connectivity as pairs of indices into `keypoints` (resolved from the
  // ndx-pose Skeleton's node-index edges by matching node names to series names).
  // Empty when the file defines no edges (DeepLabCut exports often omit them).
  edges: [number, number][];
  // Overall session-time span of the pose (across keypoints).
  timeRange: { start: number; end: number };
};

// An external-file ImageSeries the user can overlay the pose onto.
export type VideoCandidate = {
  path: string;
  name: string;
  externalBasename: string;
  // Higher = a better name-based guess for this pose; the menu sorts on it.
  score: number;
};

// ndx-pose carries no per-keypoint color, so spread hues evenly over a stable
// (discovery-order) index.
const keypointColor = (index: number, total: number): string => {
  const hue = (index * 360) / Math.max(total, 1);
  return `hsl(${hue.toFixed(1)}, 85%, 55%)`;
};

const basename = (p: string): string => p.split(/[\\/]/).pop() || p;

// Collapse a name to alphanumerics for tolerant matching between a Skeleton node
// ("leftFrontPaw") and a PoseEstimationSeries name ("PoseEstimationSeriesLeftfrontpaw").
const normalizeName = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Map a skeleton node name onto an index into `keypoints` (the series). Prefer an
// exact normalized match, then suffix, then substring. Returns -1 if none.
const matchNodeToKeypoint = (node: string, keypoints: PoseKeypoint[]): number => {
  const nn = normalizeName(node);
  if (!nn) return -1;
  const norms = keypoints.map((kp) => normalizeName(kp.name));
  let i = norms.indexOf(nn);
  if (i >= 0) return i;
  i = norms.findIndex((kn) => kn.endsWith(nn) || nn.endsWith(kn));
  if (i >= 0) return i;
  return norms.findIndex((kn) => kn.includes(nn) || nn.includes(kn));
};

// Build keypoint-index edge pairs from one ndx-pose Skeleton group (which stores
// `nodes` names and an `edges` dataset of node-index pairs). Returns the mapped
// edges plus how many node names matched this pose's keypoints (used to pick the
// right skeleton when a file has several). `edges` is optional in ndx-pose.
const edgesFromSkeleton = async (
  nwbUrl: string,
  skelPath: string,
  keypoints: PoseKeypoint[],
): Promise<{ edges: [number, number][]; matched: number }> => {
  const skel = await getHdf5Group(nwbUrl, skelPath);
  if (!skel) return { edges: [], matched: 0 };
  const edgesDs = skel.datasets.find((d) => d.name === "edges");
  const hasNodes = skel.datasets.some((d) => d.name === "nodes");
  if (!hasNodes) return { edges: [], matched: 0 };
  const nodesRaw = await getHdf5DatasetData(nwbUrl, `${skelPath}/nodes`, {});
  if (!nodesRaw) return { edges: [], matched: 0 };
  const nodes = Array.from(nodesRaw as ArrayLike<unknown>, (x) => String(x));
  const nodeToKp = nodes.map((n) => matchNodeToKeypoint(n, keypoints));
  const matched = nodeToKp.filter((i) => i >= 0).length;

  if (!edgesDs || edgesDs.shape.length !== 2 || edgesDs.shape[1] !== 2) {
    return { edges: [], matched };
  }
  const edgesRaw = await getHdf5DatasetData(nwbUrl, `${skelPath}/edges`, {});
  if (!edgesRaw) return { edges: [], matched };
  const out: [number, number][] = [];
  for (let e = 0; e < edgesDs.shape[0]; e++) {
    const a = nodeToKp[Number(edgesRaw[e * 2])];
    const b = nodeToKp[Number(edgesRaw[e * 2 + 1])];
    if (a >= 0 && b >= 0 && a !== b) out.push([a, b]);
  }
  return { edges: out, matched };
};

// Find this pose's skeleton edges as keypoint-index pairs. Looks both at a Skeleton
// linked as a subgroup of the PoseEstimation and at the canonical `Skeletons`
// container next to it (the subgroup is often a soft link whose neurodata_type is
// not surfaced), and picks the skeleton whose node names best match the keypoints.
const loadSkeletonEdges = async (
  nwbUrl: string,
  poseGroup: {
    path: string;
    subgroups: { path: string; attrs?: { [k: string]: unknown } }[];
  },
  posePath: string,
  keypoints: PoseKeypoint[],
): Promise<[number, number][]> => {
  const candidatePaths: string[] = [];
  // (a) Skeleton(s) linked directly under the PoseEstimation.
  for (const sg of poseGroup.subgroups) {
    if (sg.attrs?.neurodata_type === "Skeleton") candidatePaths.push(sg.path);
    else if (/skeleton/i.test(sg.path.split("/").pop() || "")) candidatePaths.push(sg.path);
  }
  // (b) The sibling `Skeletons` container (real group, reliable attrs).
  const parent = posePath.replace(/\/[^/]+$/, "");
  const skeletons = await getHdf5Group(nwbUrl, `${parent}/Skeletons`);
  if (skeletons) {
    for (const sg of skeletons.subgroups) candidatePaths.push(sg.path);
  }
  const seen = new Set<string>();
  const paths = candidatePaths.filter((p) => !seen.has(p) && seen.add(p));

  let best: [number, number][] = [];
  let bestMatched = -1;
  for (const sp of paths) {
    const { edges, matched } = await edgesFromSkeleton(nwbUrl, sp, keypoints);
    // Prefer the skeleton that both matches the most nodes and actually has edges.
    if (edges.length > 0 && matched > bestMatched) {
      best = edges;
      bestMatched = matched;
    }
  }
  return best;
};

// Read a series' per-frame session times: explicit `timestamps` if present, else
// synthesized from `starting_time` + `rate`. The read is attempted directly rather
// than gated on the dataset listing, because ndx-pose commonly stores the real
// `timestamps` on one series and makes the rest HDF5 links to it (which the group
// listing may not surface, but a direct read can still resolve).
const loadTimestamps = async (
  nwbUrl: string,
  seriesPath: string,
  datasets: { name: string; attrs: { [k: string]: unknown } }[],
  numFrames: number,
): Promise<Float64Array | null> => {
  try {
    const ts = await getHdf5DatasetData(nwbUrl, `${seriesPath}/timestamps`, {});
    if (ts && (ts as ArrayLike<number>).length) {
      return Float64Array.from(ts as ArrayLike<number>, Number);
    }
  } catch {
    /* fall through to starting_time */
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

// Load a PoseEstimation container: every PoseEstimationSeries (x, y columns only,
// a 3rd z/confidence column is dropped for the prototype) plus the container's
// original_videos / dimensions metadata.
export const loadPoseEstimation = async (
  nwbUrl: string,
  posePath: string,
): Promise<PoseData | null> => {
  const group = await getHdf5Group(nwbUrl, posePath);
  if (!group) return null;

  const seriesSubs = group.subgroups.filter(
    (sg) => sg.attrs?.neurodata_type === "PoseEstimationSeries",
  );
  if (seriesSubs.length === 0) return null;

  // First pass: load each series' coords and its own timestamps (if readable).
  type Loaded = {
    name: string;
    color: string;
    coords: Float32Array;
    numFrames: number;
    timestamps: Float64Array | null;
  };
  const loaded: Loaded[] = [];
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

    const timestamps = await loadTimestamps(nwbUrl, sg.path, g.datasets, numFrames);
    loaded.push({
      name: sg.name,
      color: keypointColor(i, seriesSubs.length),
      coords,
      numFrames,
      timestamps,
    });
  }

  // Second pass: ndx-pose often stores the real timestamps on only one series and
  // links the rest; if a series' linked timestamps did not resolve, reuse a sibling's
  // timestamps with the same frame count (they share the session clock).
  const keypoints: PoseKeypoint[] = [];
  for (const l of loaded) {
    let ts = l.timestamps;
    if (!ts) {
      const sibling = loaded.find(
        (o) => o.timestamps && o.timestamps.length === l.numFrames,
      );
      ts = sibling?.timestamps ?? null;
    }
    if (!ts) continue;
    keypoints.push({ name: l.name, color: l.color, coords: l.coords, timestamps: ts });
  }
  if (keypoints.length === 0) return null;

  // Container-level metadata (best-effort; both are unreliable in practice).
  let originalVideos: string[] = [];
  if (group.datasets.some((d) => d.name === "original_videos")) {
    const ov = await getHdf5DatasetData(
      nwbUrl,
      `${posePath}/original_videos`,
      {},
    );
    if (ov) {
      originalVideos = Array.from(ov as ArrayLike<unknown>, (x) =>
        String(normalizeExternalFileValue(x) ?? x),
      );
    }
  }
  const dimensions: number[][] = [];
  if (group.datasets.some((d) => d.name === "dimensions")) {
    const dimDs = group.datasets.find((d) => d.name === "dimensions");
    const dm = await getHdf5DatasetData(nwbUrl, `${posePath}/dimensions`, {});
    if (dm && dimDs && dimDs.shape.length === 2 && dimDs.shape[1] === 2) {
      for (let r = 0; r < dimDs.shape[0]; r++) {
        dimensions.push([Number(dm[r * 2]), Number(dm[r * 2 + 1])]);
      }
    }
  }

  const edges = await loadSkeletonEdges(nwbUrl, group, posePath, keypoints);

  let start = Infinity;
  let end = -Infinity;
  for (const kp of keypoints) {
    if (kp.timestamps.length === 0) continue;
    start = Math.min(start, kp.timestamps[0]);
    end = Math.max(end, kp.timestamps[kp.timestamps.length - 1]);
  }
  if (!Number.isFinite(start)) start = 0;
  if (!Number.isFinite(end)) end = 0;

  return { keypoints, originalVideos, dimensions, edges, timeRange: { start, end } };
};

// Walk the data roots for every external-file ImageSeries and rank each as a
// candidate video for this pose, using the (best-effort) original_videos names.
// Ranking is only a menu sort; the time/dimension check is what actually gates.
export const findVideoCandidates = async (
  nwbUrl: string,
  originalVideos: string[],
): Promise<VideoCandidate[]> => {
  const found: { path: string; name: string }[] = [];
  const visit = async (path: string): Promise<void> => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return;
    if (
      group.attrs?.neurodata_type === "ImageSeries" &&
      group.datasets.some((ds) => ds.name === "external_file")
    ) {
      found.push({ path: group.path, name: group.path.split("/").pop() || group.path });
    }
    for (const sub of group.subgroups || []) await visit(sub.path);
  };
  for (const root of VIDEO_DISCOVERY_ROOTS) await visit(root);

  const ovBases = originalVideos.map((v) => basename(v).toLowerCase());
  const candidates: VideoCandidate[] = [];
  for (const f of found) {
    let externalBasename = "";
    try {
      const ext = await getHdf5DatasetData(nwbUrl, `${f.path}/external_file`, {
        slice: [[0, 1]],
      });
      externalBasename = basename(
        String(normalizeExternalFileValue(ext?.[0]) ?? ""),
      );
    } catch {
      /* leave blank */
    }
    const extLower = externalBasename.toLowerCase();
    const nameLower = f.name.toLowerCase();
    let score = 0;
    for (const ov of ovBases) {
      if (!ov) continue;
      if (ov === extLower) score = Math.max(score, 3);
      else if (extLower && (ov.includes(extLower) || extLower.includes(ov)))
        score = Math.max(score, 2);
      // The ImageSeries group name often echoes the camera ("body_video" etc.).
      else if (ov.includes(nameLower) || nameLower.includes(ov.replace(/\.\w+$/, "")))
        score = Math.max(score, 1);
    }
    candidates.push({ path: f.path, name: f.name, externalBasename, score });
  }
  candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return candidates;
};

export const getVideoTimeRange = getSeriesTimeRange;

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

// The compatibility verdict shown as an obvious banner. Warn-and-allow: the
// overlay still renders, but a mismatch is surfaced loudly rather than silently
// filtered, so a wrong-video pick is obvious instead of mysteriously blank.
export type Compatibility = {
  aligned: boolean;
  headline: string;
  detail: string;
};

export const checkCompatibility = (
  pose: PoseData,
  videoRange: { startTime: number; endTime: number },
  videoDims?: { width: number; height: number } | null,
): Compatibility => {
  const tol = 2.0;
  const overlapStart = Math.max(pose.timeRange.start, videoRange.startTime);
  const overlapEnd = Math.min(pose.timeRange.end, videoRange.endTime);
  const timeOverlap = overlapEnd + tol > overlapStart;
  const poseDur = pose.timeRange.end - pose.timeRange.start;
  const fmt = (a: number, b: number) => `${a.toFixed(1)}-${b.toFixed(1)}s`;

  // NWB video timing for external-file ImageSeries is often degenerate (data
  // shape (0,0,0) -> end <= start); treat that as "unknown", not a mismatch.
  const videoTimingKnown = videoRange.endTime > videoRange.startTime;

  let dimNote = "";
  if (videoDims && pose.dimensions.length > 0) {
    const matches = pose.dimensions.some(
      ([h, w]) => h === videoDims.height && w === videoDims.width,
    );
    dimNote = matches
      ? ` Resolution ${videoDims.width}x${videoDims.height} matches the pose.`
      : ` Resolution ${videoDims.width}x${videoDims.height} does NOT match the pose dimensions (${pose.dimensions
          .map((d) => `${d[1]}x${d[0]}`)
          .join(", ")}).`;
  }

  if (!videoTimingKnown) {
    return {
      aligned: true,
      headline: "Video timing unknown",
      detail:
        `Pose spans ${fmt(pose.timeRange.start, pose.timeRange.end)}; this video has no ` +
        `usable NWB timing (external file), so alignment can only be judged visually.` +
        dimNote,
    };
  }
  if (timeOverlap) {
    return {
      aligned: true,
      headline: "Time-aligned",
      detail:
        `Pose ${fmt(pose.timeRange.start, pose.timeRange.end)} overlaps video ` +
        `${fmt(videoRange.startTime, videoRange.endTime)} (${poseDur.toFixed(0)} s of pose).` +
        dimNote,
    };
  }
  return {
    aligned: false,
    headline: "Not time-aligned",
    detail:
      `Pose spans ${fmt(pose.timeRange.start, pose.timeRange.end)} but this video spans ` +
      `${fmt(videoRange.startTime, videoRange.endTime)} - they do not overlap. The overlay is ` +
      `shown anyway; pick a different video if the keypoints do not track.` +
      dimNote,
  };
};

// Draw the keypoints for `sessionTime` onto a canvas sized to the rendered video
// box. Maps video-pixel coordinates through the same object-fit:contain box the
// <video> uses.
export const drawPoseFrame = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  pose: PoseData,
  sessionTime: number,
  hidden: Set<string>,
  showEdges: boolean,
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const scale = Math.min(canvas.width / vw, canvas.height / vh);
  const offX = (canvas.width - vw * scale) / 2;
  const offY = (canvas.height - vh * scale) / 2;
  const r = Math.max(3, Math.min(canvas.width, canvas.height) / 130);

  // Resolve every keypoint's screen position at this frame once, so edges and
  // dots share it. null = hidden or off (non-finite) and not drawn.
  const pts: ({ x: number; y: number } | null)[] = pose.keypoints.map((kp) => {
    if (hidden.has(kp.name)) return null;
    const f = frameIndexAtTime(kp.timestamps, sessionTime);
    const x = kp.coords[f * 2];
    const y = kp.coords[f * 2 + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x: offX + x * scale, y: offY + y * scale };
  });

  // Skeleton edges first, so the dots sit on top of the lines.
  if (showEdges && pose.edges.length > 0) {
    ctx.lineWidth = Math.max(1.5, r * 0.45);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    for (const [a, b] of pose.edges) {
      const pa = pts[a];
      const pb = pts[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
  }

  for (let i = 0; i < pose.keypoints.length; i++) {
    const p = pts[i];
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = pose.keypoints[i].color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#000";
    ctx.stroke();
  }
};
