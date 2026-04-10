import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { getHdf5Group } from "./hdf5Interface";
import {
  ExternalVideoCandidate,
  getExternalFileForSeries,
  getSeriesTimeRange,
  resolveExternalVideoFromFile,
} from "./externalVideoUtils";
import UnsupportedVideoPanel from "../VideoPage/UnsupportedVideoPanel";
import { useSearchParams } from "react-router-dom";

type Props = {
  nwbUrl: string;
  width: number;
  height: number;
  isExpanded?: boolean;
};

const RELEVANT_ROOT_PATHS = [
  "/acquisition",
  "/processing",
  "/analysis",
  "/stimulus",
  "/intervals",
];

const SUPPORTED_TYPES = new Set([
  "ImageSeries",
  "OnePhotonSeries",
  "TwoPhotonSeries",
]);

const START_TOLERANCE_SEC = 0.25;
const DRIFT_TOLERANCE_SEC = 0.1;

type LayoutMode = "row" | "column" | "grid";

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${tenths}`;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const areCompatible = (
  a: ExternalVideoCandidate,
  b: ExternalVideoCandidate,
  tolerance = START_TOLERANCE_SEC,
) => {
  const startDiff = Math.abs(a.startTime - b.startTime);
  if (startDiff > tolerance) {
    return false;
  }
  const overlapStart = Math.max(a.startTime, b.startTime);
  const overlapEnd = Math.min(a.endTime, b.endTime);
  return overlapEnd > overlapStart;
};

const getCompatibilityReason = (
  candidate: ExternalVideoCandidate,
  selected: ExternalVideoCandidate[],
) => {
  for (const item of selected) {
    const startDiff = Math.abs(candidate.startTime - item.startTime);
    if (startDiff > START_TOLERANCE_SEC) {
      return `Start time differs by more than ${START_TOLERANCE_SEC.toFixed(2)} s`;
    }
    const overlapStart = Math.max(candidate.startTime, item.startTime);
    const overlapEnd = Math.min(candidate.endTime, item.endTime);
    if (!(overlapEnd > overlapStart)) {
      return "No overlapping session-time range";
    }
  }
  return undefined;
};

const calculateGridDimensions = (layoutMode: LayoutMode, count: number) => {
  if (count === 0) return { rows: 0, cols: 0 };
  if (layoutMode === "row") {
    return { rows: 1, cols: count };
  }
  if (layoutMode === "column") {
    return { rows: count, cols: 1 };
  }
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { rows, cols };
};

const toLabel = (index: number) => String.fromCharCode(65 + index);

const OrderPanel: FunctionComponent<{
  selectedPaths: string[];
  setSelectedPaths: React.Dispatch<React.SetStateAction<string[]>>;
  labelMap: Map<string, string>;
  layoutMode: LayoutMode;
}> = ({ selectedPaths, setSelectedPaths, labelMap, layoutMode }) => {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const { cols } = calculateGridDimensions(layoutMode, selectedPaths.length);

  return (
    <div
      style={{
        display: "inline-grid",
        gridTemplateColumns: `repeat(${cols}, 36px)`,
        gap: 4,
      }}
    >
      {selectedPaths.map((path, index) => (
        <div
          key={path}
          draggable
          onDragStart={() => setDragFrom(index)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(index);
          }}
          onDragLeave={() => {
            if (dragOver === index) setDragOver(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragFrom !== null && dragFrom !== index) {
              setSelectedPaths((prev) => {
                const next = [...prev];
                const [item] = next.splice(dragFrom, 1);
                next.splice(index, 0, item);
                return next;
              });
            }
            setDragFrom(null);
            setDragOver(null);
          }}
          onDragEnd={() => {
            setDragFrom(null);
            setDragOver(null);
          }}
          style={{
            width: 36,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600,
            border: dragOver === index ? "2px solid #4f6df5" : "1px solid #bbb",
            borderRadius: 4,
            background:
              dragFrom === index
                ? "#e0e7ff"
                : dragOver === index
                  ? "#eef2ff"
                  : "#fff",
            cursor: "grab",
            userSelect: "none",
            color: "#4f6df5",
          }}
        >
          {labelMap.get(path) || "?"}
        </div>
      ))}
    </div>
  );
};

const ShareVideoButton: FunctionComponent<{
  selectedPaths: string[];
  candidates: ExternalVideoCandidate[];
  layoutMode: LayoutMode;
}> = ({ selectedPaths, candidates, layoutMode }) => {
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    let timer: number;
    if (showCopied) {
      timer = window.setTimeout(() => setShowCopied(false), 4500);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [showCopied]);

  const handleShare = () => {
    const url = new URL(window.location.href);
    const indices = selectedPaths
      .map((p) => candidates.findIndex((c) => c.path === p))
      .filter((i) => i >= 0);
    url.searchParams.set("videoOrder", indices.join(","));
    if (layoutMode !== "row") {
      url.searchParams.set("videoLayout", layoutMode);
    } else {
      url.searchParams.delete("videoLayout");
    }
    navigator.clipboard.writeText(url.toString()).then(() => {
      setShowCopied(true);
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Tooltip title="Copy link with current video arrangement">
        <IconButton
          size="small"
          onClick={handleShare}
          sx={{
            padding: "4px",
            backgroundColor: "#fff",
            "&:hover": { backgroundColor: "#f0f0f0" },
          }}
        >
          <ShareIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
      {showCopied && (
        <span style={{ marginLeft: 8, fontSize: 12, color: "#666" }}>
          Copied!
        </span>
      )}
    </div>
  );
};

const VideoWidgetView: FunctionComponent<Props> = ({
  nwbUrl,
  width,
  height,
  isExpanded,
}) => {
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState<ExternalVideoCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const initialVideoOrderApplied = useRef(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    const param = searchParams.get("videoLayout");
    if (param === "row" || param === "column" || param === "grid") return param;
    return "row";
  });
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  const [urlLoading, setUrlLoading] = useState<Record<string, boolean>>({});
  const [metadataLoaded, setMetadataLoaded] = useState<Record<string, boolean>>(
    {},
  );
  const [playbackErrors, setPlaybackErrors] = useState<Record<string, string>>(
    {},
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [sharedTime, setSharedTime] = useState<number | undefined>(undefined);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const syncAnimationRef = useRef<number | null>(null);

  // Apply URL params once candidates are loaded
  useEffect(() => {
    if (candidates.length === 0 || initialVideoOrderApplied.current) return;
    initialVideoOrderApplied.current = true;
    const param = searchParams.get("videoOrder");
    if (!param) return;
    const indices = param.split(",").map(Number);
    const paths = indices
      .filter((i) => !isNaN(i) && i >= 0 && i < candidates.length)
      .map((i) => candidates[i].path);
    if (paths.length > 0) {
      setSelectedPaths(paths);
    }
  }, [candidates, searchParams]);

  useEffect(() => {
    if (!isExpanded) return;
    let canceled = false;
    setLoading(true);
    setLoadingMessage("Discovering external videos...");
    setCandidates([]);

    const visitGroup = async (
      path: string,
      found: ExternalVideoCandidate[],
    ) => {
      const group = await getHdf5Group(nwbUrl, path);
      if (canceled || !group) return;

      const neurodataType = group.attrs?.neurodata_type;
      if (
        SUPPORTED_TYPES.has(neurodataType) &&
        group.datasets.some((ds) => ds.name === "external_file")
      ) {
        try {
          const externalFile = await getExternalFileForSeries(nwbUrl, path);
          const { startTime, endTime } = await getSeriesTimeRange(
            nwbUrl,
            path,
            group,
          );
          found.push({
            path,
            name: group.path.split("/").pop() || group.path,
            externalFile,
            startTime,
            endTime,
          });
        } catch (err) {
          console.warn("Problem reading external video series", path, err);
        }
      }

      for (const subgroup of group.subgroups || []) {
        if (canceled) return;
        await visitGroup(subgroup.path, found);
      }
    };

    const load = async () => {
      try {
        const found: ExternalVideoCandidate[] = [];
        for (const rootPath of RELEVANT_ROOT_PATHS) {
          if (canceled) return;
          await visitGroup(rootPath, found);
        }
        if (!canceled) {
          found.sort((a, b) => a.name.localeCompare(b.name));
          setCandidates(found);
          setLoadingMessage("");
        }
      } catch (err) {
        if (!canceled) {
          console.warn("Error discovering external videos", err);
          setLoadingMessage("");
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, isExpanded]);

  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    candidates.forEach((c, i) => map.set(c.path, toLabel(i)));
    return map;
  }, [candidates]);

  const selectedVideos = useMemo(() => {
    const candidateMap = new Map(candidates.map((c) => [c.path, c]));
    return selectedPaths
      .map((path) => candidateMap.get(path))
      .filter((c) => c !== undefined);
  }, [candidates, selectedPaths]);

  const sessionWindow = useMemo(() => {
    if (selectedVideos.length === 0) return undefined;
    const start = Math.max(...selectedVideos.map((item) => item.startTime));
    const end = Math.min(...selectedVideos.map((item) => item.endTime));
    return { start, end };
  }, [selectedVideos]);

  useEffect(() => {
    if (syncAnimationRef.current !== null) {
      cancelAnimationFrame(syncAnimationRef.current);
      syncAnimationRef.current = null;
    }
    setIsPlaying(false);
    if (sessionWindow) {
      setSharedTime((prev) =>
        prev === undefined
          ? sessionWindow.start
          : clamp(prev, sessionWindow.start, sessionWindow.end),
      );
    } else {
      setSharedTime(undefined);
    }
  }, [sessionWindow?.start, sessionWindow?.end, selectedPaths.join("|")]);

  useEffect(() => {
    if (selectedVideos.length === 0) return;
    const dandisetId = searchParams.get("dandisetId");
    const dandisetVersion = searchParams.get("dandisetVersion") || "draft";
    let canceled = false;

    const loadUrls = async () => {
      for (const candidate of selectedVideos) {
        if (resolvedUrls[candidate.path] || urlErrors[candidate.path]) {
          continue;
        }
        setUrlLoading((prev) => ({ ...prev, [candidate.path]: true }));
        try {
          const url = await resolveExternalVideoFromFile(
            nwbUrl,
            candidate.externalFile,
            dandisetId,
            dandisetVersion,
          );
          if (!canceled) {
            setResolvedUrls((prev) => ({ ...prev, [candidate.path]: url }));
          }
        } catch (err) {
          if (!canceled) {
            setUrlErrors((prev) => ({
              ...prev,
              [candidate.path]:
                err instanceof Error ? err.message : String(err),
            }));
          }
        } finally {
          if (!canceled) {
            setUrlLoading((prev) => ({ ...prev, [candidate.path]: false }));
          }
        }
      }
    };

    loadUrls();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, searchParams, selectedVideos, resolvedUrls, urlErrors]);

  const syncVideosToSessionTime = (sessionTime: number) => {
    for (const video of selectedVideos) {
      const element = videoRefs.current[video.path];
      if (!element) continue;
      const clampedSessionTime = clamp(
        sessionTime,
        video.startTime,
        video.endTime,
      );
      const nextCurrentTime = Math.max(0, clampedSessionTime - video.startTime);
      if (Math.abs(element.currentTime - nextCurrentTime) > 0.01) {
        element.currentTime = nextCurrentTime;
      }
    }
  };

  const runDriftCorrection = () => {
    if (!isPlaying || selectedVideos.length < 2) {
      syncAnimationRef.current = null;
      return;
    }
    const leader = selectedVideos[0];
    const leaderElement = videoRefs.current[leader.path];
    if (!leaderElement) {
      syncAnimationRef.current = requestAnimationFrame(runDriftCorrection);
      return;
    }
    const leaderSessionTime = leader.startTime + leaderElement.currentTime;
    for (let i = 1; i < selectedVideos.length; i++) {
      const follower = selectedVideos[i];
      const followerElement = videoRefs.current[follower.path];
      if (!followerElement) continue;
      const targetCurrentTime = Math.max(
        0,
        clamp(leaderSessionTime, follower.startTime, follower.endTime) -
          follower.startTime,
      );
      if (
        Math.abs(followerElement.currentTime - targetCurrentTime) >
        DRIFT_TOLERANCE_SEC
      ) {
        followerElement.currentTime = targetCurrentTime;
      }
    }
    syncAnimationRef.current = requestAnimationFrame(runDriftCorrection);
  };

  useEffect(() => {
    if (isPlaying && syncAnimationRef.current === null) {
      syncAnimationRef.current = requestAnimationFrame(runDriftCorrection);
    }
    if (!isPlaying && syncAnimationRef.current !== null) {
      cancelAnimationFrame(syncAnimationRef.current);
      syncAnimationRef.current = null;
    }
    return () => {
      if (syncAnimationRef.current !== null) {
        cancelAnimationFrame(syncAnimationRef.current);
        syncAnimationRef.current = null;
      }
    };
  }, [isPlaying, selectedVideos]);

  const handlePlayPause = async () => {
    if (selectedVideos.length === 0 || sharedTime === undefined) return;
    if (isPlaying) {
      selectedVideos.forEach((video) => {
        videoRefs.current[video.path]?.pause();
      });
      setIsPlaying(false);
      return;
    }

    syncVideosToSessionTime(sharedTime);
    const playPromises = selectedVideos.map(async (video) => {
      const element = videoRefs.current[video.path];
      if (!element) return;
      try {
        await element.play();
      } catch (err) {
        console.warn("Unable to play synchronized video", video.path, err);
      }
    });
    await Promise.all(playPromises);
    setIsPlaying(true);
  };

  const handleSeek = (nextTime: number) => {
    if (!sessionWindow) return;
    const clamped = clamp(nextTime, sessionWindow.start, sessionWindow.end);
    setSharedTime(clamped);
    syncVideosToSessionTime(clamped);
  };

  const gridDimensions = calculateGridDimensions(
    layoutMode,
    selectedVideos.length,
  );

  return (
    <div
      style={{
        position: "relative",
        width,
        minHeight: height,
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Video Selection{" "}
              <span
                style={{
                  position: "relative",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "#999",
                  cursor: "help",
                }}
              >
                <span
                  onMouseEnter={(e) => {
                    const tip = e.currentTarget
                      .nextElementSibling as HTMLElement;
                    if (tip) tip.style.display = "block";
                  }}
                  onMouseLeave={(e) => {
                    const tip = e.currentTarget
                      .nextElementSibling as HTMLElement;
                    if (tip) tip.style.display = "none";
                  }}
                >
                  &#x24D8;
                </span>
                <span
                  style={{
                    display: "none",
                    position: "absolute",
                    left: 0,
                    top: "100%",
                    marginTop: 4,
                    width: 260,
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: 400,
                    lineHeight: 1.4,
                    color: "#333",
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    zIndex: 10,
                  }}
                >
                  Select compatible external videos to view them with shared
                  controls. Videos are first displayed in selection order, then
                  can be rearranged in Display Arrangement below.
                </span>
              </span>
            </div>
            {loading && <div>{loadingMessage || "Loading..."}</div>}
            {!loading && candidates.length === 0 && (
              <div>No external videos were found in this NWB file.</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {candidates.map((candidate) => {
                const isSelected = selectedPaths.includes(candidate.path);
                const selectedOthers = selectedVideos.filter(
                  (video) => video.path !== candidate.path,
                );
                const compatible =
                  isSelected ||
                  selectedOthers.length === 0 ||
                  selectedOthers.every((video) =>
                    areCompatible(candidate, video),
                  );
                const reason =
                  compatible || selectedOthers.length === 0
                    ? undefined
                    : getCompatibilityReason(candidate, selectedOthers);
                return (
                  <label
                    key={candidate.path}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: 8,
                      borderRadius: 6,
                      background: compatible ? "#f7f7f7" : "#fdf2f2",
                      color: compatible ? "inherit" : "#8a1c1c",
                      cursor:
                        compatible || isSelected ? "pointer" : "not-allowed",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!compatible && !isSelected}
                      onChange={(e) => {
                        setSelectedPaths((prev) => {
                          if (e.target.checked) {
                            return [...prev, candidate.path];
                          }
                          return prev.filter((path) => path !== candidate.path);
                        });
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {isSelected && (
                          <span style={{ color: "#4f6df5", marginRight: 4 }}>
                            [{labelMap.get(candidate.path)}]
                          </span>
                        )}
                        {candidate.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {candidate.path}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {formatTime(candidate.startTime)} -{" "}
                        {formatTime(candidate.endTime)}
                      </div>
                      {reason && (
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          {reason}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                Display Arrangement
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["row", "column", "grid"] as LayoutMode[]).map((mode) => (
                  <label
                    key={mode}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="radio"
                      name="video-layout-mode"
                      checked={layoutMode === mode}
                      onChange={() => setLayoutMode(mode)}
                    />
                    {mode[0].toUpperCase() + mode.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ color: "#666", marginBottom: 12, fontSize: 12 }}>
              Drag tiles to reorder videos in the display.
            </div>
            <OrderPanel
              selectedPaths={selectedPaths}
              setSelectedPaths={setSelectedPaths}
              labelMap={labelMap}
              layoutMode={layoutMode}
            />
          </div>
        </div>

        {/* Right column: Video Display + playback controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              flex: 1,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 600 }}>Video Display</div>
              {selectedVideos.length > 0 && (
                <ShareVideoButton
                  selectedPaths={selectedPaths}
                  candidates={candidates}
                  layoutMode={layoutMode}
                />
              )}
            </div>
            {selectedVideos.length === 0 ? (
              <div style={{ color: "#666" }}>
                Select one or more external videos to display them here.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    gridDimensions.cols > 0
                      ? `repeat(${gridDimensions.cols}, minmax(0, 1fr))`
                      : undefined,
                  gap: 12,
                  maxWidth:
                    gridDimensions.cols > 0
                      ? gridDimensions.cols * 480 +
                        (gridDimensions.cols - 1) * 12
                      : undefined,
                }}
              >
                {selectedVideos.map((video) => {
                  const resolvedUrl = resolvedUrls[video.path];
                  const playbackError = playbackErrors[video.path];
                  const tileError = urlErrors[video.path] || playbackError;
                  return (
                    <div key={video.path}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        {video.name}
                      </div>
                      {tileError ? (
                        <UnsupportedVideoPanel message={tileError} />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "16 / 9",
                            backgroundColor: "#111",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {(!resolvedUrl || !metadataLoaded[video.path]) && (
                            <div style={{ color: "#ccc", fontSize: 14 }}>
                              {urlLoading[video.path]
                                ? "Resolving video..."
                                : "Loading video..."}
                            </div>
                          )}
                          {resolvedUrl && (
                            <video
                              ref={(element) => {
                                videoRefs.current[video.path] = element;
                              }}
                              src={resolvedUrl}
                              muted
                              playsInline
                              preload="auto"
                              onLoadedMetadata={() => {
                                setMetadataLoaded((prev) => ({
                                  ...prev,
                                  [video.path]: true,
                                }));
                                const current =
                                  sharedTime === undefined
                                    ? video.startTime
                                    : sharedTime;
                                const target = clamp(
                                  current,
                                  video.startTime,
                                  video.endTime,
                                );
                                const element = videoRefs.current[video.path];
                                if (element) {
                                  element.currentTime = Math.max(
                                    0,
                                    target - video.startTime,
                                  );
                                }
                              }}
                              onTimeUpdate={() => {
                                if (
                                  !isPlaying ||
                                  selectedVideos[0]?.path !== video.path
                                ) {
                                  return;
                                }
                                const leader = selectedVideos[0];
                                const element = videoRefs.current[leader.path];
                                if (!element) return;
                                const nextTime = clamp(
                                  leader.startTime + element.currentTime,
                                  sessionWindow?.start ?? leader.startTime,
                                  sessionWindow?.end ?? leader.endTime,
                                );
                                setSharedTime(nextTime);
                              }}
                              onEnded={() => {
                                if (selectedVideos[0]?.path === video.path) {
                                  setIsPlaying(false);
                                }
                              }}
                              onError={() => {
                                setPlaybackErrors((prev) => ({
                                  ...prev,
                                  [video.path]:
                                    "This video could not be played by the browser because its container or codec is not supported. Most likely, the uploaded video uses a non-browser-supported codec or container.",
                                }));
                              }}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                display: metadataLoaded[video.path]
                                  ? "block"
                                  : "none",
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedVideos.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                background: "#fafafa",
              }}
            >
              <button
                onClick={handlePlayPause}
                disabled={selectedVideos.length === 0}
                style={{ padding: "4px 12px", cursor: "pointer" }}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                min={sessionWindow?.start ?? 0}
                max={sessionWindow?.end ?? 1}
                step={0.01}
                value={sharedTime ?? sessionWindow?.start ?? 0}
                onChange={(e) => handleSeek(Number(e.target.value))}
                disabled={!sessionWindow}
                style={{ flex: 1 }}
              />
              <div
                style={{
                  minWidth: 100,
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 13,
                }}
              >
                {sessionWindow && sharedTime !== undefined
                  ? `${formatTime(sharedTime)} / ${formatTime(sessionWindow.end)}`
                  : ""}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoWidgetView;
