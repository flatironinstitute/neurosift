import { useCssVars } from "@components/useCssVars";
import {
  AccordionItem,
  Checkbox,
  EmptyState,
  formatSeconds,
  IconButton,
  LoadingState,
  Playback,
  SegmentedControl,
  TimeOverview,
  useToast,
  ViewPanel,
} from "@ui";
import {
  FunctionComponent,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getHdf5Dataset, getHdf5Group } from "./hdf5Interface";
import { IrregularTimeseriesTimestampsClient } from "@shared/TimeseriesTimestampsClient/TimeseriesTimestampsClient";
import {
  describeVideoPlaybackError,
  ExternalVideoCandidate,
  getExternalFileForSeries,
  getSeriesTimeRange,
  resolveExternalVideoFromFile,
  VIDEO_DISCOVERY_ROOTS,
  VideoProblem,
  videoProblemOf,
} from "./externalVideoUtils";

import { useSearchParams } from "react-router-dom";
import { useSetSearchParamsKeepingHash } from "./urlHash";
import { neurodataTypeInheritsFrom } from "./neurodataTypeInheritance";
import { useNwbFileSpecifications } from "./SpecificationsView/SetupNwbFileSpecificationsProvider";
import VideoUnavailable from "./VideoUnavailable";
import "./MultiVideoTabView.css";

type Props = {
  nwbUrl: string;
  width: number;
  height: number;
  isExpanded?: boolean;
};

const START_TOLERANCE_SEC = 0.25;
const DRIFT_TOLERANCE_SEC = 0.1;
// Left/Right arrow keys seek the shared timeline by this much (YouTube uses 5 s).
const ARROW_SEEK_SEC = 5;

type LayoutMode = "row" | "column" | "grid";

const LAYOUT_OPTIONS: { value: LayoutMode; label: string }[] = [
  { value: "row", label: "Row" },
  { value: "column", label: "Column" },
  { value: "grid", label: "Grid" },
];

const plural = (n: number, word: string) =>
  `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

/** Largest index i such that timestamps[i] <= t (timestamps assumed ascending). */
const findFrameIndexForSessionTime = (timestamps: Float64Array, t: number) => {
  const last = timestamps.length - 1;
  if (t <= timestamps[0]) return 0;
  if (t >= timestamps[last]) return last;
  let lo = 0;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timestamps[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
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

// videoOrder encodes both the selection and its order. We serialize by series
// name (stable across changes to the file's set of videos) rather than by
// positional index; decoding accepts names or, for backward compatibility with
// older links, numeric indices into the candidate list.
const encodeVideoOrder = (
  selectedPaths: string[],
  candidates: ExternalVideoCandidate[],
) => {
  const byPath = new Map(candidates.map((c) => [c.path, c]));
  return selectedPaths
    .map((p) => byPath.get(p)?.name)
    .filter((n): n is string => !!n)
    .join(",");
};

const decodeVideoOrder = (
  param: string,
  candidates: ExternalVideoCandidate[],
) => {
  const byName = new Map(candidates.map((c) => [c.name, c]));
  return param
    .split(",")
    .map((token) => {
      const named = byName.get(token);
      if (named) return named.path;
      const index = Number(token);
      if (Number.isInteger(index) && index >= 0 && index < candidates.length) {
        return candidates[index].path;
      }
      return undefined;
    })
    .filter((p): p is string => !!p);
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
  const ref = useCssVars<HTMLDivElement>({ "--cols": String(cols) });

  return (
    <div ref={ref} className="videos-order">
      {selectedPaths.map((path, index) => (
        <div
          key={path}
          className="videos-order-tile"
          data-dragging={dragFrom === index ? "" : undefined}
          data-over={dragOver === index ? "" : undefined}
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
        >
          {labelMap.get(path) || "?"}
        </div>
      ))}
    </div>
  );
};

/** The tile around one video: its title and frame, sized by the grid. */
const VideoTile: FunctionComponent<{
  title: string;
  shown: boolean;
  order: number;
  children: ReactNode;
}> = ({ title, shown, order, children }) => {
  const ref = useCssVars<HTMLElement>({ "--order": String(order) });
  return (
    <figure
      ref={ref}
      className="videos-tile"
      data-hidden={shown ? undefined : ""}
    >
      <figcaption className="videos-tile-title">{title}</figcaption>
      {children}
    </figure>
  );
};

const MultiVideoTabView: FunctionComponent<Props> = ({
  nwbUrl,
  isExpanded,
}) => {
  const [searchParams] = useSearchParams();
  const setSearchParams = useSetSearchParamsKeepingHash();
  const specifications = useNwbFileSpecifications();
  const [candidates, setCandidates] = useState<ExternalVideoCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  // Paths whose <video> element has ever been selected. This set only grows: a
  // deselected camera stays mounted (hidden and paused) so reselecting it is
  // instant and keeps its playback position, with no remount churn.
  const [mountedPaths, setMountedPaths] = useState<string[]>([]);
  const initialVideoOrderApplied = useRef(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    const param = searchParams.get("videoLayout");
    if (param === "row" || param === "column" || param === "grid") return param;
    return "row";
  });
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [urlErrors, setUrlErrors] = useState<Record<string, VideoProblem>>({});
  const [urlLoading, setUrlLoading] = useState<Record<string, boolean>>({});
  const [metadataLoaded, setMetadataLoaded] = useState<Record<string, boolean>>(
    {},
  );
  // Cameras that are selected but kept hidden until they finish seeking to the
  // shared time, so a re-displayed camera never shows its stale (pre-seek) frame.
  const [resyncPending, setResyncPending] = useState<Record<string, boolean>>(
    {},
  );
  // Per-series per-frame timestamps, keyed by path, materialized once into a
  // plain Float64Array so the drift loop can map session time to a frame with a
  // synchronous binary search (no per-frame I/O). A null entry means the series
  // has no usable timestamps, so the uniform-rate fallback is used. Held in a
  // ref because the loop reads it directly.
  const timestampsRef = useRef<Record<string, Float64Array | null>>({});
  const [playbackErrors, setPlaybackErrors] = useState<
    Record<string, VideoProblem>
  >({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [open, setOpen] = useState({ videos: true, arrangement: true });
  const toast = useToast();
  const [sharedTime, setSharedTime] = useState<number | undefined>(undefined);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const syncAnimationRef = useRef<number | null>(null);
  // Mirrors isPlaying so the async drift loop can read the latest value across
  // its await points and stop cleanly.
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  // The drift loop is long-lived; these refs let it read the current selection
  // and shared time on every frame instead of capturing a stale closure when a
  // camera is toggled on or off.
  const selectedVideosRef = useRef<ExternalVideoCandidate[]>([]);
  const sharedTimeRef = useRef<number | undefined>(undefined);
  sharedTimeRef.current = sharedTime;
  // Previous selection, used to detect cameras that were just (re)displayed so
  // they can be caught up to the shared time.
  const prevSelectedRef = useRef<string[]>([]);
  // A shared time captured from the URL (?videoTime=, in session seconds),
  // applied once when the window is first known so a shared link lands on that
  // moment (paused). Consumed after the first seed.
  const initialVideoTimeRef = useRef<number | undefined>(
    (() => {
      const raw = searchParams.get("videoTime");
      const value = raw === null ? NaN : Number(raw);
      return Number.isFinite(value) ? value : undefined;
    })(),
  );

  // Apply URL params once candidates are loaded
  useEffect(() => {
    if (candidates.length === 0 || initialVideoOrderApplied.current) return;
    initialVideoOrderApplied.current = true;
    const param = searchParams.get("videoOrder");
    if (!param) return;
    const paths = decodeVideoOrder(param, candidates);
    if (paths.length > 0) {
      setSelectedPaths(paths);
    }
  }, [candidates, searchParams]);

  // Live-persist selection order and layout to the URL (replace, no history
  // churn) so a refresh restores the arrangement and the address bar reflects
  // the current view. Defaults are omitted. The time cursor is intentionally NOT
  // written live (it moves ~4 Hz); it is captured only on Share.
  useEffect(() => {
    if (
      !isExpanded ||
      candidates.length === 0 ||
      !initialVideoOrderApplied.current
    ) {
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const order = encodeVideoOrder(selectedPaths, candidates);
        if (order) next.set("videoOrder", order);
        else next.delete("videoOrder");
        if (layoutMode !== "row") next.set("videoLayout", layoutMode);
        else next.delete("videoLayout");
        return next;
      },
      { replace: true },
    );
  }, [isExpanded, selectedPaths, layoutMode, candidates, setSearchParams]);

  useEffect(() => {
    if (!isExpanded) return;
    let canceled = false;
    setLoading(true);
    setCandidates([]);

    const visitGroup = async (
      path: string,
      found: ExternalVideoCandidate[],
    ) => {
      const group = await getHdf5Group(nwbUrl, path);
      if (canceled || !group) return;

      const neurodataType = group.attrs?.neurodata_type;
      if (
        neurodataTypeInheritsFrom(
          neurodataType,
          "ImageSeries",
          specifications,
        ) &&
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
        for (const rootPath of VIDEO_DISCOVERY_ROOTS) {
          if (canceled) return;
          await visitGroup(rootPath, found);
        }
        if (!canceled) {
          found.sort((a, b) => a.name.localeCompare(b.name));
          setCandidates(found);
        }
      } catch (err) {
        if (!canceled) {
          console.warn("Error discovering external videos", err);
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
  }, [nwbUrl, isExpanded, specifications]);

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
  selectedVideosRef.current = selectedVideos;

  // Grow the mounted set to include everything currently selected.
  useEffect(() => {
    setMountedPaths((prev) => {
      const next = [...prev];
      for (const path of selectedPaths) {
        if (!next.includes(path)) next.push(path);
      }
      return next.length === prev.length ? prev : next;
    });
  }, [selectedPaths]);

  // Candidates that should stay mounted (ever-selected), regardless of whether
  // they are currently displayed.
  const mountedVideos = useMemo(() => {
    const candidateMap = new Map(candidates.map((c) => [c.path, c]));
    return mountedPaths
      .map((path) => candidateMap.get(path))
      .filter((c) => c !== undefined);
  }, [candidates, mountedPaths]);

  const sessionWindow = useMemo(() => {
    if (selectedVideos.length === 0) return undefined;
    const start = Math.max(...selectedVideos.map((item) => item.startTime));
    const end = Math.min(...selectedVideos.map((item) => item.endTime));
    return { start, end };
  }, [selectedVideos]);

  // Keep the shared time inside the current session window as the selection
  // changes. Toggling a camera must NOT stop playback (videos stay mounted), so
  // we only halt when nothing is selected at all.
  useEffect(() => {
    if (!sessionWindow) {
      setIsPlaying(false);
      setSharedTime(undefined);
      return;
    }
    // Consume the URL seed in the effect body (not inside the state updater,
    // which React double-invokes and which must stay pure).
    const seed = initialVideoTimeRef.current;
    initialVideoTimeRef.current = undefined;
    if (seed !== undefined) {
      setSharedTime(clamp(seed, sessionWindow.start, sessionWindow.end));
      return;
    }
    setSharedTime((prev) =>
      prev === undefined
        ? sessionWindow.start
        : clamp(prev, sessionWindow.start, sessionWindow.end),
    );
    // Keyed to the window's bounds, not the object, so toggling a camera that leaves them alone doesn't re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionWindow?.start, sessionWindow?.end]);

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
              [candidate.path]: videoProblemOf(err),
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

  // Materialize the full per-frame timestamps for each selected series once,
  // into a plain Float64Array. We use the existing timestamps client only to
  // fetch (a single bounded read), then keep the array in memory so the hot loop
  // can do synchronous lookups instead of awaiting per-frame chunk reads.
  useEffect(() => {
    if (selectedVideos.length === 0) return;
    let canceled = false;

    const loadTimestamps = async () => {
      for (const candidate of selectedVideos) {
        if (candidate.path in timestampsRef.current) continue;
        try {
          const dataset = await getHdf5Dataset(
            nwbUrl,
            `${candidate.path}/timestamps`,
          );
          if (!dataset || dataset.shape[0] < 2) {
            timestampsRef.current[candidate.path] = null;
            continue;
          }
          const client = new IrregularTimeseriesTimestampsClient(
            nwbUrl,
            candidate.path,
          );
          const data = await client.getTimestampsForDataIndices(
            0,
            dataset.shape[0],
          );
          if (canceled) return;
          timestampsRef.current[candidate.path] =
            data instanceof Float64Array
              ? data
              : Float64Array.from(data as ArrayLike<number>);
        } catch (err) {
          console.warn("Problem loading video timestamps", candidate.path, err);
          timestampsRef.current[candidate.path] = null;
        }
      }
    };

    loadTimestamps();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, selectedVideos]);

  // Map a session time to the file currentTime of the frame active at that time.
  // With per-frame timestamps this handles differing frame rates and dropped
  // frames; without them it falls back to the uniform start-offset assumption.
  const sessionTimeToFileTime = (
    video: ExternalVideoCandidate,
    sessionTime: number,
    element: HTMLVideoElement,
  ) => {
    const timestamps = timestampsRef.current[video.path];
    const duration = element.duration;
    if (
      timestamps &&
      timestamps.length > 1 &&
      duration &&
      isFinite(duration) &&
      Number.isFinite(sessionTime)
    ) {
      const frameIndex = findFrameIndexForSessionTime(timestamps, sessionTime);
      return clamp(
        (frameIndex / (timestamps.length - 1)) * duration,
        0,
        duration,
      );
    }
    return Math.max(0, sessionTime - video.startTime);
  };

  // Inverse of sessionTimeToFileTime: read the session time of the frame the
  // element is currently showing.
  const fileTimeToSessionTime = (
    video: ExternalVideoCandidate,
    element: HTMLVideoElement,
  ) => {
    const timestamps = timestampsRef.current[video.path];
    const duration = element.duration;
    if (
      timestamps &&
      timestamps.length > 1 &&
      duration &&
      isFinite(duration) &&
      Number.isFinite(element.currentTime)
    ) {
      const frameIndex = clamp(
        Math.round((element.currentTime / duration) * (timestamps.length - 1)),
        0,
        timestamps.length - 1,
      );
      return timestamps[frameIndex];
    }
    return video.startTime + element.currentTime;
  };

  const syncVideosToSessionTime = (sessionTime: number) => {
    for (const video of selectedVideos) {
      const element = videoRefs.current[video.path];
      if (!element) continue;
      const clampedSessionTime = clamp(
        sessionTime,
        video.startTime,
        video.endTime,
      );
      const nextCurrentTime = sessionTimeToFileTime(
        video,
        clampedSessionTime,
        element,
      );
      if (Math.abs(element.currentTime - nextCurrentTime) > 0.01) {
        element.currentTime = nextCurrentTime;
      }
    }
  };

  // One synchronous pass of drift correction, rescheduled every animation frame
  // while playing. The lookups are in-memory (no awaits), so the pass cannot
  // stall or be killed by a rejected promise, and reads the live selection from
  // a ref so toggling cameras never restarts the loop.
  const runDriftCorrection = () => {
    const currentVideos = selectedVideosRef.current;
    if (!isPlayingRef.current || currentVideos.length < 2) {
      syncAnimationRef.current = null;
      return;
    }
    const leader = currentVideos[0];
    const leaderElement = videoRefs.current[leader.path];
    if (leaderElement) {
      const leaderSessionTime = fileTimeToSessionTime(leader, leaderElement);
      for (let i = 1; i < currentVideos.length; i++) {
        const follower = currentVideos[i];
        const followerElement = videoRefs.current[follower.path];
        if (!followerElement) continue;
        const clampedLeaderSession = clamp(
          leaderSessionTime,
          follower.startTime,
          follower.endTime,
        );
        const targetCurrentTime = sessionTimeToFileTime(
          follower,
          clampedLeaderSession,
          followerElement,
        );
        if (
          Math.abs(followerElement.currentTime - targetCurrentTime) >
          DRIFT_TOLERANCE_SEC
        ) {
          followerElement.currentTime = targetCurrentTime;
        }
        // Restart a follower that is paused, e.g. a camera toggled off and back
        // on. Seeking above happens first, so it cannot abort this play() the
        // way an out-of-band seek would.
        if (followerElement.paused) {
          followerElement.play().catch(() => {});
        }
      }
    }
    syncAnimationRef.current = isPlayingRef.current
      ? requestAnimationFrame(runDriftCorrection)
      : null;
  };

  // Drive the drift loop while playing with at least two cameras. The loop reads
  // the current selection from a ref, so toggling cameras does not restart it;
  // gating on the count restarts it if the selection drops to one (no leader /
  // follower pair) and then grows back.
  const driftActive = isPlaying && selectedVideos.length >= 2;
  useEffect(() => {
    if (driftActive && syncAnimationRef.current === null) {
      syncAnimationRef.current = requestAnimationFrame(runDriftCorrection);
    }
    if (!driftActive && syncAnimationRef.current !== null) {
      cancelAnimationFrame(syncAnimationRef.current);
      syncAnimationRef.current = null;
    }
    return () => {
      if (syncAnimationRef.current !== null) {
        cancelAnimationFrame(syncAnimationRef.current);
        syncAnimationRef.current = null;
      }
    };
    // runDriftCorrection reads everything through refs; depending on it would restart the loop every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driftActive]);

  // React to selection changes on the mounted-but-hidden videos: pause anything
  // that is no longer displayed, and catch up anything just (re)displayed to the
  // shared time (resuming it if we are playing). The drift loop keeps it locked
  // afterwards. This runs in a layout effect (before paint) so a re-displayed
  // camera is marked resyncPending and hidden before its stale frame can flash.
  useLayoutEffect(() => {
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selectedPaths;

    for (const video of mountedVideos) {
      if (!selectedPaths.includes(video.path)) {
        videoRefs.current[video.path]?.pause();
      }
    }
    // Drop any pending-resync flags for cameras no longer selected.
    setResyncPending((prevPending) => {
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const path of Object.keys(prevPending)) {
        if (selectedPaths.includes(path)) next[path] = prevPending[path];
        else changed = true;
      }
      return changed ? next : prevPending;
    });

    const newlyShown = selectedPaths.filter((path) => !prev.includes(path));
    newlyShown.forEach((path) => {
      const video = mountedVideos.find((v) => v.path === path);
      const element = videoRefs.current[path];
      if (!video || !element) return;
      const t = sharedTimeRef.current;
      const target =
        t !== undefined
          ? sessionTimeToFileTime(
              video,
              clamp(t, video.startTime, video.endTime),
              element,
            )
          : undefined;
      const playIfStillSelected = () => {
        if (
          isPlayingRef.current &&
          selectedVideosRef.current.some((v) => v.path === path)
        ) {
          element.play().catch(() => {});
        }
      };

      // Genuine re-display (already has metadata) that needs a real seek: keep
      // the panel hidden until the seek lands so the stale frame is never shown.
      if (
        metadataLoaded[path] &&
        target !== undefined &&
        Math.abs(element.currentTime - target) > 0.05
      ) {
        setResyncPending((prevPending) => ({ ...prevPending, [path]: true }));
        const reveal = () => {
          element.removeEventListener("seeked", reveal);
          window.clearTimeout(timer);
          setResyncPending((prevPending) => {
            if (!prevPending[path]) return prevPending;
            const next = { ...prevPending };
            delete next[path];
            return next;
          });
          playIfStillSelected();
        };
        // Fallback in case "seeked" never fires (e.g. already-buffered no-op).
        const timer = window.setTimeout(reveal, 2000);
        element.addEventListener("seeked", reveal);
        element.currentTime = target;
      } else {
        if (target !== undefined) element.currentTime = target;
        playIfStillSelected();
      }
    });
  }, [selectedPaths, mountedVideos, metadataLoaded]);

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

  // Left/Right arrows seek the shared timeline by ARROW_SEEK_SEC, YouTube-style.
  // Held in a ref so the window listener always calls the latest closure without
  // re-subscribing on every shared-time tick.
  const handleSeekRef = useRef(handleSeek);
  handleSeekRef.current = handleSeek;
  const handlePlayPauseRef = useRef(handlePlayPause);
  handlePlayPauseRef.current = handlePlayPause;
  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key === " ") {
        // Space plays and pauses unless a control has focus, which keeps its own Space.
        if (target?.matches("button, input, select, textarea, a, [role]"))
          return;
        e.preventDefault();
        handlePlayPauseRef.current();
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // Ignore only controls where arrows have their own meaning: text entry,
      // selects, and the layout radios (arrow keys move the radio group). The
      // scrub slider (range) and the camera checkboxes still get the 5 s seek —
      // we preventDefault below so the slider's tiny native step doesn't fire —
      // so arrows work right after scrubbing, like YouTube.
      const tag = target?.tagName;
      const inputType = (target as HTMLInputElement | null)?.type;
      const isTextOrNavControl =
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable === true ||
        (tag === "INPUT" && inputType !== "range" && inputType !== "checkbox");
      if (isTextOrNavControl) return;
      const current = sharedTimeRef.current;
      if (current === undefined) return;
      e.preventDefault();
      const delta = e.key === "ArrowLeft" ? -ARROW_SEEK_SEC : ARROW_SEEK_SEC;
      handleSeekRef.current(current + delta);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExpanded]);

  useEffect(() => {
    for (const element of Object.values(videoRefs.current))
      if (element) element.playbackRate = Number(speed);
  }, [speed]);

  const gridDimensions = calculateGridDimensions(
    layoutMode,
    selectedVideos.length,
  );
  const gridRef = useCssVars<HTMLDivElement>({
    "--cols": String(Math.max(gridDimensions.cols, 1)),
  });

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set(
      "videoOrder",
      encodeVideoOrder(selectedPaths, candidates),
    );
    if (layoutMode !== "row") url.searchParams.set("videoLayout", layoutMode);
    else url.searchParams.delete("videoLayout");
    // Capture the current moment (YouTube-style), so the link lands there.
    if (sharedTime !== undefined && Number.isFinite(sharedTime))
      url.searchParams.set("videoTime", sharedTime.toFixed(2));
    else url.searchParams.delete("videoTime");
    navigator.clipboard
      .writeText(url.toString())
      .then(() => toast.show({ status: "success", message: "Link copied" }));
  };

  const tileTitle = (video: ExternalVideoCandidate) =>
    `${labelMap.get(video.path)} · ${video.name}`;

  return (
    <ViewPanel
      label="Videos"
      summary={
        loading
          ? "Finding videos in this file"
          : `${plural(candidates.length, "video")} in this file · played on one clock`
      }
      busy={loading}
      controls={
        selectedVideos.length > 0 && (
          <>
            <Playback
              playing={isPlaying}
              onPlayingChange={(next) => {
                if (next !== isPlaying) handlePlayPause();
              }}
              speed={speed}
              onSpeedChange={setSpeed}
              time={sharedTime ?? sessionWindow?.start ?? 0}
            />
            <IconButton
              icon="share"
              label="Copy link to this arrangement and time"
              size="sm"
              variant="ghost"
              onClick={handleShare}
            />
          </>
        )
      }
      overview={
        sessionWindow &&
        sessionWindow.end > sessionWindow.start && (
          <TimeOverview
            session={sessionWindow}
            value={{ start: sharedTime ?? sessionWindow.start, duration: 0 }}
            cursor={sharedTime}
            onChange={(v) => handleSeek(v.start + v.duration / 2)}
          />
        )
      }
      settings={
        candidates.length > 0 && (
          <>
            <AccordionItem
              title="Videos"
              summary={`${selectedVideos.length} of ${candidates.length} shown`}
              open={open.videos}
              onToggle={(o) => setOpen((prev) => ({ ...prev, videos: o }))}
            >
              <ul className="videos-list">
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
                    <li key={candidate.path} className="videos-item">
                      <Checkbox
                        label={tileTitle(candidate)}
                        checked={isSelected}
                        disabled={!compatible && !isSelected}
                        onChange={(checked) =>
                          setSelectedPaths((prev) =>
                            checked
                              ? [...prev, candidate.path]
                              : prev.filter((path) => path !== candidate.path),
                          )
                        }
                      />
                      <p className="videos-item-note">
                        {candidate.path} ·{" "}
                        {candidate.endTime > candidate.startTime
                          ? `${formatSeconds(candidate.startTime)}–${formatSeconds(candidate.endTime)} s`
                          : "no frame times"}
                      </p>
                      {reason && <p className="videos-item-note">{reason}</p>}
                    </li>
                  );
                })}
              </ul>
            </AccordionItem>
            {selectedVideos.length >= 2 && (
              <AccordionItem
                title="Arrangement"
                summary={
                  LAYOUT_OPTIONS.find((o) => o.value === layoutMode)?.label
                }
                open={open.arrangement}
                onToggle={(o) =>
                  setOpen((prev) => ({ ...prev, arrangement: o }))
                }
              >
                <SegmentedControl
                  label="Arrangement"
                  size="sm"
                  value={layoutMode}
                  onChange={(v) => setLayoutMode(v as LayoutMode)}
                  options={LAYOUT_OPTIONS}
                />
                <p className="videos-item-note">
                  Drag the tiles to reorder the videos.
                </p>
                <OrderPanel
                  selectedPaths={selectedPaths}
                  setSelectedPaths={setSelectedPaths}
                  labelMap={labelMap}
                  layoutMode={layoutMode}
                />
              </AccordionItem>
            )}
          </>
        )
      }
    >
      {loading ? (
        <LoadingState label="Finding videos in this file" phase="loading" />
      ) : candidates.length === 0 ? (
        <EmptyState title="No videos in this file">
          This file has no ImageSeries stored in an external video file.
        </EmptyState>
      ) : (
        selectedVideos.length === 0 && (
          <EmptyState title="No video shown">Check one in the list.</EmptyState>
        )
      )}
      <div ref={gridRef} className="videos-grid">
        {mountedVideos.map((video) => {
          const resolvedUrl = resolvedUrls[video.path];
          const tileProblem =
            urlErrors[video.path] || playbackErrors[video.path];
          // Deselected videos stay mounted (so reselecting is instant and keeps
          // their position) but hidden; a re-displayed one stays hidden until it
          // has seeked to the shared time, so its stale frame is never shown.
          const selectionIndex = selectedPaths.indexOf(video.path);
          const isShown = selectionIndex >= 0 && !resyncPending[video.path];
          return (
            <VideoTile
              key={video.path}
              title={tileTitle(video)}
              shown={isShown}
              order={isShown ? selectionIndex : 0}
            >
              {tileProblem ? (
                <VideoUnavailable problem={tileProblem} />
              ) : (
                <div className="videos-frame">
                  {(!resolvedUrl || !metadataLoaded[video.path]) && (
                    <LoadingState
                      label={
                        urlLoading[video.path]
                          ? "Finding the video on DANDI"
                          : "Loading the video"
                      }
                      phase="loading"
                    />
                  )}
                  {resolvedUrl && (
                    <video
                      ref={(element) => {
                        videoRefs.current[video.path] = element;
                      }}
                      className="videos-video"
                      data-hidden={metadataLoaded[video.path] ? undefined : ""}
                      src={resolvedUrl}
                      muted
                      playsInline
                      preload="auto"
                      onLoadedMetadata={(e) => {
                        e.currentTarget.playbackRate = Number(speed);
                        setMetadataLoaded((prev) => ({
                          ...prev,
                          [video.path]: true,
                        }));
                        const current =
                          sharedTimeRef.current === undefined
                            ? video.startTime
                            : sharedTimeRef.current;
                        const target = clamp(
                          current,
                          video.startTime,
                          video.endTime,
                        );
                        const element = videoRefs.current[video.path];
                        if (element) {
                          element.currentTime = sessionTimeToFileTime(
                            video,
                            target,
                            element,
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
                        setSharedTime(
                          clamp(
                            fileTimeToSessionTime(leader, element),
                            sessionWindow?.start ?? leader.startTime,
                            sessionWindow?.end ?? leader.endTime,
                          ),
                        );
                      }}
                      onEnded={() => {
                        if (selectedVideos[0]?.path === video.path) {
                          setIsPlaying(false);
                        }
                      }}
                      onError={() => {
                        if (!resolvedUrl) return;
                        describeVideoPlaybackError(resolvedUrl).then(
                          (problem) =>
                            setPlaybackErrors((prev) => ({
                              ...prev,
                              [video.path]: problem,
                            })),
                        );
                      }}
                    />
                  )}
                </div>
              )}
            </VideoTile>
          );
        })}
      </div>
    </ViewPanel>
  );
};

export default MultiVideoTabView;
