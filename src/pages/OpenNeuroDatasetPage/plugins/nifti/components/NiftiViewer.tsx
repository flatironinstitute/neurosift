import React, { useEffect, useRef, useState } from "react";
import { Box, LinearProgress, Typography, Slider } from "@mui/material";
import * as nifti from "nifti-reader-js";

interface NiftiViewerProps {
  fileUrl: string;
  width?: number;
  height?: number;
}

interface NIFTI1 {
  dims: number[];
  datatypeCode: number;
}

interface NIFTI2 {
  dims: number[];
  datatypeCode: number;
}

const NiftiViewer: React.FC<NiftiViewerProps> = ({
  fileUrl,
  width,
  height,
}) => {
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlice, setCurrentSlice] = useState<number>(0);
  const [niftiHeader, setNiftiHeader] = useState<NIFTI1 | NIFTI2 | null>(null);
  const [niftiImage, setNiftiImage] = useState<ArrayBuffer | null>(null);
  const [totalSlices, setTotalSlices] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const downloadAndProcessFile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Download the file with progress tracking
        const response = await fetch(fileUrl);
        const reader = response.body?.getReader();
        const contentLength = Number(response.headers.get("Content-Length"));

        if (!reader) {
          throw new Error("Unable to read response");
        }

        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          chunks.push(value);
          receivedLength += value.length;

          if (contentLength) {
            setDownloadProgress((receivedLength / contentLength) * 100);
          }
        }

        // Combine chunks into a single Uint8Array
        const allChunks = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          allChunks.set(chunk, position);
          position += chunk.length;
        }

        // Convert to ArrayBuffer for nifti-reader-js
        let data = allChunks.buffer;

        // Check if the file is compressed
        if (nifti.isCompressed(data)) {
          data = nifti.decompress(data);
        }

        if (!nifti.isNIFTI(data)) {
          throw new Error("Not a valid NIFTI file");
        }

        // Parse NIFTI header and image
        const header = nifti.readHeader(data);
        if (!header) {
          throw new Error("Failed to read NIFTI header");
        }

        const image = nifti.readImage(header, data);

        setNiftiHeader(header);
        setNiftiImage(image);
        setTotalSlices(header.dims[3]);
        setCurrentSlice(Math.floor(header.dims[3] / 2));
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    downloadAndProcessFile();
  }, [fileUrl]);

  useEffect(() => {
    if (!niftiHeader || !niftiImage || !canvasRef.current) return;

    const drawCanvas = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cols = niftiHeader.dims[1];
      const rows = niftiHeader.dims[2];

      canvas.width = cols;
      canvas.height = rows;

      const imageData = ctx.createImageData(cols, rows);

      // Create appropriate TypedArray based on datatype
      let typedData;
      switch (niftiHeader.datatypeCode) {
        case nifti.NIFTI1.TYPE_UINT8:
          typedData = new Uint8Array(niftiImage);
          break;
        case nifti.NIFTI1.TYPE_INT16:
          typedData = new Int16Array(niftiImage);
          break;
        case nifti.NIFTI1.TYPE_INT32:
          typedData = new Int32Array(niftiImage);
          break;
        case nifti.NIFTI1.TYPE_FLOAT32:
          typedData = new Float32Array(niftiImage);
          break;
        case nifti.NIFTI1.TYPE_FLOAT64:
          typedData = new Float64Array(niftiImage);
          break;
        case nifti.NIFTI1.TYPE_INT8:
          typedData = new Int8Array(niftiImage);
          break;
        case nifti.NIFTI1.TYPE_UINT16:
          typedData = new Uint16Array(niftiImage);
          break;
        case nifti.NIFTI1.TYPE_UINT32:
          typedData = new Uint32Array(niftiImage);
          break;
        default:
          setError(`Unsupported datatype: ${niftiHeader.datatypeCode}`);
          return;
      }

      const sliceSize = cols * rows;
      const sliceOffset = sliceSize * currentSlice;

      // Find data range for scaling
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < sliceSize; i++) {
        const value = typedData[sliceOffset + i];
        min = Math.min(min, value);
        max = Math.max(max, value);
      }

      // Draw pixels with scaling
      for (let row = 0; row < rows; row++) {
        const rowOffset = row * cols;

        for (let col = 0; col < cols; col++) {
          const offset = sliceOffset + rowOffset + col;
          const value = typedData[offset];

          // Scale value to 0-255 range
          const normalizedValue = Math.floor(
            ((value - min) / (max - min)) * 255,
          );

          const pixelIndex = (rowOffset + col) * 4;
          imageData.data[pixelIndex] = normalizedValue;
          imageData.data[pixelIndex + 1] = normalizedValue;
          imageData.data[pixelIndex + 2] = normalizedValue;
          imageData.data[pixelIndex + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };

    drawCanvas();
  }, [niftiHeader, niftiImage, currentSlice]);

  const handleSliderChange = (_event: Event, value: number | number[]) => {
    setCurrentSlice(value as number);
  };

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading NIFTI file...</Typography>
        <LinearProgress variant="determinate" value={downloadProgress} />
      </Box>
    );
  }

  return (
    <Box sx={{ width, height, p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: "100%",
            height: "auto",
            border: "1px solid #ccc",
          }}
        />
      </Box>
      <Box sx={{ px: 2 }}>
        <Slider
          value={currentSlice}
          onChange={handleSliderChange}
          min={0}
          max={totalSlices - 1}
          valueLabelDisplay="auto"
        />
      </Box>
    </Box>
  );
};

export default NiftiViewer;
