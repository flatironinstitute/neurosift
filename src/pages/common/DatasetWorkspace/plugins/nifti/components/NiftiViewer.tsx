/* eslint-disable @typescript-eslint/no-explicit-any */
import { getRedirectUrl, isDandiAssetUrl } from "@hdf5Interface";
import { useCssVars } from "@components/useCssVars";
import { Button, Checkbox, LoadingState, Select } from "@ui";
import FramesNote from "./FramesNote";
import { Niivue, SHOW_RENDER } from "./niivue_dist";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import getAuthorizationHeaderForUrl from "../../../../../util/getAuthorizationHeaderForUrl";
import { addRequestWatermark } from "../../../../../../util/requestWatermark";
import ViewError from "@components/ViewError/ViewError";
import "./NiftiViewer.css";

const SLICE_TYPES = [
  { value: "0", label: "Axial" },
  { value: "1", label: "Coronal" },
  { value: "2", label: "Sagittal" },
  { value: "4", label: "Render" },
  { value: "3", label: "A+C+S+R" },
];

interface NiftiViewerProps {
  fileUrl: string;
  width?: number;
  height?: number;
}

const NiftiViewer: React.FC<NiftiViewerProps> = ({
  fileUrl,
  width = 800,
  height = 600,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sliceType, setSliceType] = useState<number>(3); // Default to A+C+S+R
  const [normalizeGraph, setNormalizeGraph] = useState<boolean>(false);
  const [perVolumeRange, setPerVolumeRange] = useState<boolean>(false);
  const [perVolumeContrast, setPerVolumeContrast] = useState<boolean>(false);
  const [currentVolume, setCurrentVolume] = useState<number>(0);
  const canvasId = useMemo(
    () => `gl-canvas-${Math.random().toString(36).slice(2, 11)}`,
    [],
  );
  const niivueRef = useRef<Niivue | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const root = useCssVars<HTMLDivElement>({
    "--nifti-width": width,
    "--nifti-height": height,
  });

  const handleFrameChange = useCallback(
    (volume: any, index: any) => {
      if (!perVolumeContrast || !volume) return;
      volume.calMinMax(index);
      if (niivueRef.current) {
        niivueRef.current.updateGLVolume();
        const str = `frame ${index} intensity ${volume.cal_min.toFixed(2)}..${volume.cal_max.toFixed(2)}`;
        console.log(str);
      }
    },
    [perVolumeContrast],
  );

  const [locationString, setLocationString] = useState<string>("");

  function handleLocationChange(data: any) {
    if (data.string) {
      setLocationString(data.string);
    }
  }

  // Initialize NiiVue viewer
  useEffect(() => {
    if (!canvas) {
      return;
    }

    let nv1: Niivue | null = null;

    // Load the volume
    const loadVolume = async () => {
      // sleep for 0.5 seconds
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        setLoading(true);
        setError(null);
        niivueRef.current = null;

        // Niivue fetches the volume itself, so the watermark has to be in the
        // url handed to it (getRedirectUrl already applies it).
        let redirectUrl: string | null = addRequestWatermark(fileUrl);
        if (isDandiAssetUrl(fileUrl)) {
          const authorizationHeader = getAuthorizationHeaderForUrl(fileUrl);
          const headers = authorizationHeader
            ? { Authorization: authorizationHeader }
            : undefined;
          redirectUrl = await getRedirectUrl(fileUrl, headers);
          if (!redirectUrl) {
            throw new Error("Failed to get redirect URL");
          }
          console.info(`Redirecting to: ${redirectUrl}`);
        }

        const volumeList1 = [
          {
            url: redirectUrl,
            name: "volume.nii.gz",
            limitFrames4D: 5,
          },
        ];
        nv1 = new Niivue({
          onLocationChange: handleLocationChange,
          onFrameChange: handleFrameChange,
          logLevel: "debug",
        } as any);
        nv1.attachTo(canvasId);
        nv1.setRadiologicalConvention(false);
        nv1.setSliceType(nv1.sliceTypeMultiplanar);
        nv1.graph.autoSizeMultiplanar = true;
        nv1.opts.multiplanarShowRender = SHOW_RENDER.ALWAYS;
        nv1.graph.normalizeValues = false;
        nv1.graph.opacity = 1.0;

        await nv1.loadVolumes(volumeList1);

        niivueRef.current = nv1;
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError(
          `Failed to load NIfTI file: ${err.message || "An unknown error occurred"}`,
        );
        setLoading(false);
      }
    };

    loadVolume();

    // Cleanup function
    return () => {
      if (nv1) {
        // need to clean up the viewer (not sure how to do that)
      }
    };
  }, [fileUrl, canvasId, canvas, handleFrameChange]);

  if (error) {
    return <ViewError what="the NIfTI image" error={error} />;
  }

  const volume = niivueRef.current?.volumes[0];
  const stepFrame = (step: number) => {
    if (!volume) return;
    const newVol = Math.min(
      Math.max(0, currentVolume + step),
      Math.max(0, (volume.nFrame4D ?? 0) - 1),
    );
    setCurrentVolume(newVol);
    niivueRef.current?.setFrame4D(volume.id, newVol);
  };

  return (
    <div className="nifti-viewer" ref={root}>
      {loading ? (
        <LoadingState label="Loading the NIfTI image" phase="loading" />
      ) : (
        <div className="nifti-viewer-controls">
          <Select
            label="View"
            size="sm"
            value={String(sliceType)}
            options={SLICE_TYPES}
            onChange={(next) => {
              const value = Number(next);
              setSliceType(value);
              niivueRef.current?.setSliceType(value);
            }}
          />
          <Checkbox
            label="Normalize graph"
            checked={normalizeGraph}
            onChange={(checked) => {
              setNormalizeGraph(checked);
              if (niivueRef.current) {
                niivueRef.current.graph.normalizeValues = checked;
                niivueRef.current.updateGLVolume();
              }
            }}
          />
          <Checkbox
            label="Per-volume graph range"
            checked={perVolumeRange}
            onChange={(checked) => {
              setPerVolumeRange(checked);
              if (niivueRef.current) {
                niivueRef.current.graph.isRangeCalMinMax = checked;
                niivueRef.current.updateGLVolume();
              }
            }}
          />
          <Checkbox
            label="Per-volume contrast"
            checked={perVolumeContrast}
            onChange={(checked) => {
              setPerVolumeContrast(checked);
              if (volume) handleFrameChange(volume, currentVolume);
            }}
          />
          <div
            className="nifti-viewer-frames"
            role="group"
            aria-label="4D frames"
          >
            <Button
              size="sm"
              icon="chevron--left"
              onClick={() => stepFrame(-1)}
            >
              Previous frame
            </Button>
            <Button
              size="sm"
              icon="chevron--right"
              onClick={() => stepFrame(1)}
            >
              Next frame
            </Button>
          </div>
        </div>
      )}
      {!loading && (
        <FramesNote
          loaded={volume?.nFrame4D ?? 0}
          total={volume?.nTotalFrame4D ?? 0}
        />
      )}
      <div className="nifti-viewer-canvas">
        <canvas id={canvasId} ref={(elmt) => setCanvas(elmt)} />
      </div>
      {!loading && (
        <p className="nifti-viewer-location">
          {locationString || "Click image to see voxel information"}
        </p>
      )}
    </div>
  );
};

export default NiftiViewer;
