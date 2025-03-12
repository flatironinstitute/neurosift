/* eslint-disable @typescript-eslint/no-explicit-any */
import { getRedirectUrl, isDandiAssetUrl } from "@hdf5Interface";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { Niivue, SHOW_RENDER } from "./niivue_dist";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import getAuthorizationHeaderForUrl from "../../../../../util/getAuthorizationHeaderForUrl";

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

        let redirectUrl: string | null = fileUrl;
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
          `Failed to load NIFTI file: ${err.message || "An unknown error occurred"}`,
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
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  // Helper function to safely get nFrame4D
  const getNFrame4D = () => {
    return niivueRef.current?.volumes[0]?.nFrame4D ?? 0;
  };

  return (
    <Box sx={{ width, p: 2 }}>
      <Box sx={{ mb: 2 }}>
        {loading ? (
          <div>
            <Typography>Loading NIFTI file...</Typography>
            <LinearProgress />
          </div>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <FormControl size="small">
              <Select
                value={sliceType}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setSliceType(value);
                  if (niivueRef.current) {
                    niivueRef.current.setSliceType(value);
                  }
                }}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value={0}>Axial</MenuItem>
                <MenuItem value={1}>Coronal</MenuItem>
                <MenuItem value={2}>Sagittal</MenuItem>
                <MenuItem value={4}>Render</MenuItem>
                <MenuItem value={3}>A+C+S+R</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={normalizeGraph}
                  onChange={(e) => {
                    setNormalizeGraph(e.target.checked);
                    if (niivueRef.current) {
                      niivueRef.current.graph.normalizeValues =
                        e.target.checked;
                      niivueRef.current.updateGLVolume();
                    }
                  }}
                />
              }
              label="normalize graph"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={perVolumeRange}
                  onChange={(e) => {
                    setPerVolumeRange(e.target.checked);
                    if (niivueRef.current) {
                      niivueRef.current.graph.isRangeCalMinMax =
                        e.target.checked;
                      niivueRef.current.updateGLVolume();
                    }
                  }}
                />
              }
              label="per-volume graph range"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={perVolumeContrast}
                  onChange={(e) => {
                    setPerVolumeContrast(e.target.checked);
                    if (niivueRef.current?.volumes[0]) {
                      handleFrameChange(
                        niivueRef.current.volumes[0],
                        currentVolume,
                      );
                    }
                  }}
                />
              }
              label="per-volume contrast"
            />

            <Button
              onClick={() => {
                const volume = niivueRef.current?.volumes[0];
                if (!volume) return;
                const newVol = Math.max(0, currentVolume - 1);
                setCurrentVolume(newVol);
                niivueRef.current?.setFrame4D(volume.id, newVol);
              }}
            >
              back
            </Button>

            <Button
              onClick={() => {
                const volume = niivueRef.current?.volumes[0];
                if (!volume) return;
                const newVol = Math.min(currentVolume + 1, getNFrame4D() - 1);
                setCurrentVolume(newVol);
                niivueRef.current?.setFrame4D(volume.id, newVol);
              }}
            >
              forward
            </Button>

            <Button
              onClick={() => {
                const volume = niivueRef.current?.volumes[0];
                if (!volume) return;
                const total = volume.nTotalFrame4D;
                const current = volume.nFrame4D;
                alert(
                  `4D images can be slow to load. Click the '...' icon below the graph to see the entire dataset. Currently displaying ${current} of ${total} frames.`,
                );
              }}
            >
              about
            </Button>
          </Box>
        )}
      </Box>
      <Box sx={{ position: "relative", height }}>
        <canvas
          id={canvasId}
          ref={(elmt) => setCanvas(elmt)}
          style={{
            width: "100%",
            height: "100%",
            border: "1px solid #ccc",
          }}
        />
      </Box>
      {!loading && (
        <Box sx={{ mt: 1, p: 1, borderTop: "1px solid #ccc" }}>
          <Typography variant="body2" color="textSecondary">
            {locationString || "Click image to see voxel information"}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default NiftiViewer;
