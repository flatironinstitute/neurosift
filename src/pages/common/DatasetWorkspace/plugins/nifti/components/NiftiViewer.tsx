import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Box,
  LinearProgress,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Niivue, SLICE_TYPE } from "@niivue/niivue";
import { getRedirectUrl, isDandiAssetUrl } from "@hdf5Interface";
import getAuthorizationHeaderForUrl from "../../../../../util/getAuthorizationHeaderForUrl";

interface NiftiViewerProps {
  fileUrl: string;
  width?: number;
  height?: number;
}

// Using NiiVue's built-in slice types
const ViewType = {
  Axial: SLICE_TYPE.AXIAL,
  Coronal: SLICE_TYPE.CORONAL,
  Sagittal: SLICE_TYPE.SAGITTAL,
  Multiplanar: SLICE_TYPE.MULTIPLANAR,
  Render: SLICE_TYPE.RENDER,
} as const;

type ViewTypeValue = (typeof ViewType)[keyof typeof ViewType];

const NiftiViewer: React.FC<NiftiViewerProps> = ({
  fileUrl,
  width = 800,
  height = 600,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const canvasId = useMemo(
    () => `gl-canvas-${Math.random().toString(36).slice(2, 11)}`,
    [],
  );
  const [viewType, setViewType] = useState<ViewTypeValue>(ViewType.Multiplanar);
  const niivueRef = useRef<Niivue | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  // Initialize NiiVue viewer
  useEffect(() => {
    if (!canvas) {
      return;
    }

    const nv = new Niivue({
      dragAndDropEnabled: true,
    });

    niivueRef.current = nv;
    nv.attachTo(canvasId);

    // Load the volume
    const loadVolume = async () => {
      try {
        setLoading(true);
        setError(null);

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

        await nv.loadVolumes([
          {
            url: redirectUrl,
            colormap: "gray",
          },
        ]);

        nv.setSliceType(viewType);
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

    return () => {
      if (niivueRef.current) {
        // Clear all volumes and dispose of WebGL resources
        niivueRef.current.volumes = [];
        niivueRef.current.drawScene();
        niivueRef.current = null;
      }
    };
  }, [fileUrl, canvasId, viewType, canvas]);

  // Update view type when changed
  useEffect(() => {
    if (niivueRef.current) {
      niivueRef.current.setSliceType(viewType);
    }
  }, [viewType]);

  const handleViewTypeChange = (event: { target: { value: string } }) => {
    setViewType(Number(event.target.value) as ViewTypeValue);
  };

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width, p: 2 }}>
      <Box sx={{ mb: 2 }}>
        {loading ? (
          <div>
            <Typography>Loading NIFTI file...</Typography>
            <LinearProgress />
          </div>
        ) : (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>View Type</InputLabel>
            <Select
              value={viewType.toString()}
              onChange={handleViewTypeChange}
              label="View Type"
            >
              <MenuItem value={SLICE_TYPE.AXIAL}>Axial</MenuItem>
              <MenuItem value={SLICE_TYPE.CORONAL}>Coronal</MenuItem>
              <MenuItem value={SLICE_TYPE.SAGITTAL}>Sagittal</MenuItem>
              <MenuItem value={SLICE_TYPE.MULTIPLANAR}>Multiplanar</MenuItem>
              <MenuItem value={SLICE_TYPE.RENDER}>3D Render</MenuItem>
            </Select>
          </FormControl>
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
    </Box>
  );
};

export default NiftiViewer;
