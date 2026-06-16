import { getHdf5DatasetData } from "@hdf5Interface";
import { FunctionComponent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getSeriesTimeRange,
  resolveExternalVideoUrl,
} from "../../externalVideoUtils";
import BehavioralBoutsView, {
  PreloadedBouts,
} from "../BehavioralBouts/BehavioralBoutsView";
import {
  BehavioralBoutsData,
  Bout,
  BoutLabel,
  buildBoutColorMap,
} from "../BehavioralBouts/behavioralBoutsUtils";
import {
  getPoseExtent,
  loadPoseEstimation,
  PoseData,
  SourceRect,
} from "../PoseEstimation/poseEstimationUtils";
import {
  findBehavioralVideoSeries,
  findMotifSeries,
  findPoseEstimationPath,
  runLengthEncodeMotifs,
} from "./vameUtils";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
};

// VAME is now a thin ADAPTER over the BehavioralBouts viewer: it reads the
// per-frame ndx-vame MotifSeries, run-length-encodes it into bouts in the
// browser (no NWB change), wraps that as a BehavioralBouts table (motif id =
// label id, "Motif N" names), resolves the behavioral video and the linked pose
// through the SHARED loaders, and hands the whole thing to BehavioralBoutsView as
// a preloaded table. So the VAME view IS the BehavioralBouts view, fed by RLE
// rather than a stored table. No kinematics are computed here (the table is
// passed as-is), so VAME has no per-bout value columns.
const VAMEView: FunctionComponent<Props> = ({
  width = 900,
  height = 600,
  nwbUrl,
  path,
}) => {
  const [searchParams] = useSearchParams();
  const [preloaded, setPreloaded] = useState<PreloadedBouts>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let canceled = false;
    setPreloaded(undefined);
    setError(undefined);
    (async () => {
      try {
        const info = await findMotifSeries(nwbUrl, path);
        if (!info) throw new Error("No MotifSeries found in this VAMEProject.");
        const raw = await getHdf5DatasetData(nwbUrl, `${info.path}/data`, {});
        if (!raw) throw new Error("Could not load MotifSeries data.");

        // Run-length-encode the per-frame motif labels into bouts, then express
        // them in the BehavioralBouts shape (motif id -> labelId, "Motif N" name).
        const motifBouts = runLengthEncodeMotifs(raw as ArrayLike<number>, info);
        const distinct = Array.from(
          new Set(motifBouts.map((b) => b.motif)),
        ).sort((a, b) => a - b);
        const colorMap = buildBoutColorMap(distinct);
        const labels: BoutLabel[] = distinct.map((m) => ({
          labelId: m,
          name: `Motif ${m}`,
          color: colorMap.get(m) ?? "#888",
        }));
        const bouts: Bout[] = motifBouts.map((b) => ({
          startTime: b.startTime,
          stopTime: b.stopTime,
          labelId: b.motif,
          label: `Motif ${b.motif}`,
        }));
        const data: BehavioralBoutsData = {
          bouts,
          labels,
          labelingMethod: "automated",
          sourceSoftware: "VAME",
          extraColumns: [],
        };

        // Behavioral video (best-effort; some VAME exports have none).
        let hasVideo = false;
        let videoUrl: string | undefined;
        let videoStartTime = 0;
        const videoPath = await findBehavioralVideoSeries(nwbUrl);
        if (videoPath) {
          try {
            const range = await getSeriesTimeRange(nwbUrl, videoPath);
            const url = await resolveExternalVideoUrl(
              nwbUrl,
              videoPath,
              searchParams.get("dandisetId"),
              searchParams.get("dandisetVersion") || "draft",
            );
            hasVideo = true;
            videoUrl = url;
            videoStartTime = range.startTime || 0;
          } catch {
            /* leave hasVideo false (pose-only / ethogram-only) */
          }
        }

        // Linked pose, loaded through the shared pose machinery.
        let poseData: PoseData | null = null;
        let poseSrcExtent: SourceRect | null = null;
        const posePath = await findPoseEstimationPath(nwbUrl, path);
        if (posePath) {
          const pose = await loadPoseEstimation(nwbUrl, posePath);
          if (pose) {
            poseData = pose;
            poseSrcExtent = getPoseExtent(pose);
          }
        }

        if (canceled) return;
        setPreloaded({
          title: path.split("/").pop() || path,
          data,
          observed: null,
          hasVideo,
          videoUrl,
          videoStartTime,
          poseData,
          poseSrcExtent,
          // The OFT VAME data needs ~0.5 s pose/video alignment; user-adjustable.
          defaultOffsetSec: 0.5,
        });
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path, searchParams]);

  if (error) {
    return (
      <div style={{ padding: 20, color: "#a33" }}>
        Unable to render VAME view: {error}
      </div>
    );
  }
  if (!preloaded) {
    return <div style={{ padding: 20 }}>Loading VAME data...</div>;
  }
  return (
    <BehavioralBoutsView
      width={width}
      height={height}
      nwbUrl={nwbUrl}
      path={path}
      preloaded={preloaded}
    />
  );
};

export default VAMEView;
