import { getRedirectUrl } from "@hdf5Interface";
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import getAuthorizationHeaderForUrl from "../../../util/getAuthorizationHeaderForUrl";
import { resolveExternalVideoUrl } from "../../externalVideoUtils";
import {
  checkCompatibility,
  Compatibility,
  drawPoseFrame,
  findVideoCandidates,
  getVideoTimeRange,
  loadPoseEstimation,
  PoseData,
  VideoCandidate,
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
};

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
  const [searchParams] = useSearchParams();

  const [pose, setPose] = useState<PoseData | null>(null);
  const [poseError, setPoseError] = useState<string>();
  const [candidates, setCandidates] = useState<VideoCandidate[]>([]);
  const [selectedVideoPath, setSelectedVideoPath] = useState<string>("");
  const [video, setVideo] = useState<ResolvedVideo | null>(null);
  const [videoError, setVideoError] = useState<string>();
  const [codecError, setCodecError] = useState(false);
  const [videoDims, setVideoDims] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Skeleton edges are off by default (many files define no edges at all).
  const [showEdges, setShowEdges] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Load the pose container.
  useEffect(() => {
    let canceled = false;
    setPose(null);
    setPoseError(undefined);
    (async () => {
      try {
        const data = await loadPoseEstimation(nwbUrl, path);
        if (canceled) return;
        if (!data) throw new Error("No PoseEstimationSeries found in this container.");
        setPose(data);
      } catch (err) {
        if (!canceled) setPoseError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path]);

  // Discover + rank candidate videos once the pose (its original_videos) is known.
  useEffect(() => {
    if (!pose) return;
    let canceled = false;
    (async () => {
      const cands = await findVideoCandidates(nwbUrl, pose.originalVideos);
      if (canceled) return;
      setCandidates(cands);
      // Default to the best-ranked candidate (the suggestion).
      setSelectedVideoPath((prev) => prev || (cands[0]?.path ?? ""));
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, pose]);

  // Resolve the selected video to a playable URL + its session-time range.
  useEffect(() => {
    if (!selectedVideoPath) return;
    let canceled = false;
    setVideo(null);
    setVideoError(undefined);
    setCodecError(false);
    setVideoDims(null);
    (async () => {
      try {
        const downloadUrl = await resolveExternalVideoUrl(
          nwbUrl,
          selectedVideoPath,
          searchParams.get("dandisetId"),
          searchParams.get("dandisetVersion") || "draft",
        );
        // A native <video> cannot send the DANDI auth header, so for an embargoed
        // asset the /download/ URL 401s. Pre-resolve the presigned S3 URL (with
        // auth) and play that; a no-op for public assets.
        const auth = getAuthorizationHeaderForUrl(downloadUrl);
        const redirected = await getRedirectUrl(
          downloadUrl,
          auth ? { Authorization: auth } : undefined,
        );
        const range = await getVideoTimeRange(nwbUrl, selectedVideoPath);
        if (canceled) return;
        setVideo({
          url: redirected || downloadUrl,
          startTime: range.startTime,
          endTime: range.endTime,
        });
      } catch (err) {
        if (!canceled) setVideoError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, selectedVideoPath, searchParams]);

  // Keep the overlay canvas buffer matched to the rendered video box so the
  // contain-mapping math is in the same pixel space.
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [video]);

  // Single rAF loop: redraw the keypoints at the video's current session time
  // (videoStartTime + currentTime). Runs while playing and paused.
  useEffect(() => {
    if (!pose || !video) return;
    let raf = 0;
    let active = true;
    const loop = () => {
      if (!active) return;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v && c) {
        drawPoseFrame(c, v, pose, video.startTime + v.currentTime, hidden, showEdges);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [pose, video, hidden, showEdges, box]);

  const compatibility: Compatibility | null = useMemo(() => {
    if (!pose || !video) return null;
    return checkCompatibility(
      pose,
      { startTime: video.startTime, endTime: video.endTime },
      videoDims,
    );
  }, [pose, video, videoDims]);

  if (poseError) {
    return (
      <div style={{ padding: 20, color: "#a33" }}>
        Unable to render PoseEstimation: {poseError}
      </div>
    );
  }
  if (!pose) return <div style={{ padding: 20 }}>Loading pose data...</div>;

  const selectedCandidate = candidates.find((c) => c.path === selectedVideoPath);

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
      {/* Controls: video selection (suggested first, overridable). */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "6px 10px",
          fontSize: 13,
          borderBottom: "1px solid #eee",
          flexWrap: "wrap",
        }}
      >
        <strong>{path.split("/").pop()}</strong>
        <span style={{ color: "#666" }}>{pose.keypoints.length} keypoints</span>
        <label style={{ whiteSpace: "nowrap" }}>
          Video:{" "}
          <select
            value={selectedVideoPath}
            onChange={(e) => setSelectedVideoPath(e.target.value)}
            style={{ maxWidth: 360 }}
          >
            {candidates.length === 0 && <option value="">(no videos found)</option>}
            {candidates.map((c, index) => (
              <option key={c.path} value={c.path}>
                {index === 0 && c.score > 0 ? "[suggested] " : ""}
                {c.path}
                {c.externalBasename ? ` (${c.externalBasename})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label
          style={{
            whiteSpace: "nowrap",
            color: pose.edges.length === 0 ? "#aaa" : undefined,
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
          />{" "}
          Skeleton{pose.edges.length > 0 ? ` (${pose.edges.length})` : ""}
        </label>
      </div>

      {/* Compatibility banner: obvious, warn-and-allow. */}
      {compatibility && (
        <div
          style={{
            padding: "5px 10px",
            fontSize: 12,
            background: compatibility.aligned ? "#eef8ee" : "#fff4e5",
            color: compatibility.aligned ? "#256029" : "#8a5a00",
            borderBottom: `1px solid ${compatibility.aligned ? "#cfe8cf" : "#f0d8a8"}`,
          }}
        >
          <strong>{compatibility.headline}.</strong> {compatibility.detail}
        </div>
      )}

      {/* Video + pose overlay. */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#111" }}>
        {videoError || codecError ? (
          <div style={{ padding: 18, color: "#6b5a2e" }}>
            {videoError
              ? `Could not resolve the video: ${videoError}`
              : "This video could not be played (its container or codec is not " +
                "supported by the browser, e.g. AVI or MKV). Pick a different video."}
          </div>
        ) : !selectedCandidate ? (
          <div style={{ padding: 18, color: "#aaa" }}>
            No external-file video in this file to overlay the pose on.
          </div>
        ) : !video ? (
          <div style={{ padding: 18, color: "#aaa" }}>Resolving video...</div>
        ) : (
          <div
            ref={boxRef}
            style={{ position: "absolute", inset: 0 }}
          >
            <video
              ref={videoRef}
              src={video.url}
              controls
              muted
              playsInline
              onError={() => setCodecError(true)}
              onLoadedMetadata={(e) =>
                setVideoDims({
                  width: e.currentTarget.videoWidth,
                  height: e.currentTarget.videoHeight,
                })
              }
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
          </div>
        )}
      </div>

      {/* Keypoint legend / visibility toggles. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "5px 10px",
          borderTop: "1px solid #eee",
          fontSize: 11,
        }}
      >
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
              title="Toggle this keypoint"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "1px 7px",
                border: "1px solid #ddd",
                borderRadius: 10,
                background: off ? "#f4f4f4" : "#fff",
                color: off ? "#aaa" : "#333",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: off ? "#ccc" : kp.color,
                  border: "1px solid #0003",
                }}
              />
              {kp.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PoseEstimationView;
