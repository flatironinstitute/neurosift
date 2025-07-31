export type NeurotileData = {
  // data: number[][][]; // 3D array: [time][channel][min, max]
  numChannels: number;
  numSamples: number;
  data: Int16Array;
  spikesData?: Int16Array | null;
  startTimeSec: number;
  endTimeSec: number;
  startChannel: number;
  endChannel: number;
  downsamplingLevel: number;
  mode?: "raw" | "spikes" | "overlay";
};

export interface RenderHeatmapProps {
  context: CanvasRenderingContext2D;
  neurotileData: NeurotileData;
  width: number;
  height: number;
  margins: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  cancelHandle: { canceled: boolean };
}

export const renderHeatmap = async ({
  context,
  neurotileData,
  width,
  height,
  margins,
  cancelHandle,
}: RenderHeatmapProps) => {
  const showRenderTime = true;
  let timer = Date.now();

  const { data } = neurotileData;

  const plotWidth = width - margins.left - margins.right;
  const plotHeight = height - margins.top - margins.bottom;

  const numCoveredSamples = neurotileData.numSamples;
  const numChannels = neurotileData.numChannels;

  if (numCoveredSamples === 0 || numChannels === 0) return;

  const isSpikesMode = neurotileData.mode === "spikes";
  const isOverlayMode = neurotileData.mode === "overlay";

  // Calculate min/max from the data that will actually be shown
  let minValue = Infinity;
  let maxValue = -Infinity;
  const spikesMinValue = 0;
  let spikesMaxValue = 0;

  if (isSpikesMode) {
    // For spikes mode, data is single values (spike counts)
    for (let t = 0; t < numCoveredSamples; t++) {
      for (let c = 0; c < numChannels; c++) {
        const value = data[t * numChannels + c];
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    }
    // For spikes, always start from 0
    minValue = 0;
  } else if (isOverlayMode) {
    // For overlay mode, calculate min/max for both datasets
    // Raw data min/max
    for (let t = 0; t < numCoveredSamples; t++) {
      for (let c = 0; c < numChannels; c++) {
        const valueMin = data[t * numChannels * 2 + c * 2];
        const valueMax = data[t * numChannels * 2 + c * 2 + 1];
        minValue = Math.min(minValue, valueMin);
        maxValue = Math.max(maxValue, valueMax);
      }
    }

    // Spikes data min/max
    if (neurotileData.spikesData) {
      for (let t = 0; t < numCoveredSamples; t++) {
        for (let c = 0; c < numChannels; c++) {
          const spikeCount = neurotileData.spikesData[t * numChannels + c];
          spikesMaxValue = Math.max(spikesMaxValue, spikeCount);
        }
      }
    }
  } else {
    // For raw mode, data has min/max pairs
    for (let t = 0; t < numCoveredSamples; t++) {
      for (let c = 0; c < numChannels; c++) {
        const valueMin = data[t * numChannels * 2 + c * 2];
        const valueMax = data[t * numChannels * 2 + c * 2 + 1];
        minValue = Math.min(minValue, valueMin);
        maxValue = Math.max(maxValue, valueMax);
      }
    }
  }

  // Handle edge case where all values are the same
  if (minValue === maxValue) {
    maxValue = minValue + 1;
  }
  if (spikesMinValue === spikesMaxValue && spikesMaxValue > 0) {
    spikesMaxValue = spikesMinValue + 1;
  }

  if (isSpikesMode) {
    // For spikes mode, draw rectangles for non-zero bins to avoid resampling issues
    context.fillStyle = "black";
    context.fillRect(margins.left, margins.top, plotWidth, plotHeight);

    // Helper function to get spike color
    const getSpikeColor = (spikeCount: number): string => {
      if (spikeCount === 0) return "rgb(0, 0, 0)";

      const normalizedValue = (spikeCount - minValue) / (maxValue - minValue);
      const intensity = normalizedValue;

      if (intensity < 0.33) {
        // Black to red
        const t = intensity / 0.33;
        const red = Math.floor(255 * t);
        return `rgb(${red}, 0, 0)`;
      } else if (intensity < 0.66) {
        // Red to yellow
        const t = (intensity - 0.33) / 0.33;
        const green = Math.floor(255 * t);
        return `rgb(255, ${green}, 0)`;
      } else {
        // Yellow to white
        const t = (intensity - 0.66) / 0.34;
        const blue = Math.floor(255 * t);
        return `rgb(255, 255, ${blue})`;
      }
    };

    // Draw rectangles for non-zero spike bins
    for (let t = 0; t < numCoveredSamples; t++) {
      const elapsed = Date.now() - timer;
      if (elapsed > 30) {
        await new Promise((resolve) => setTimeout(resolve, 0)); // Yield to browser
        if (cancelHandle.canceled) return;
        timer = Date.now(); // Reset timer for next interval
      }

      for (let c = 0; c < numChannels; c++) {
        const spikeCount = data[t * numChannels + c];

        if (spikeCount > 0) {
          // Calculate rectangle position and size
          const rectX = margins.left + (t * plotWidth) / numCoveredSamples;
          const rectY =
            margins.top + ((numChannels - 1 - c) * plotHeight) / numChannels;
          const rectWidth = plotWidth / numCoveredSamples;
          const rectHeight = plotHeight / numChannels;

          context.fillStyle = getSpikeColor(spikeCount);
          context.fillRect(rectX, rectY, rectWidth, rectHeight);
        }
      }
    }
  } else {
    // For raw mode, use the bitmap approach
    const imageData = context.createImageData(plotWidth, plotHeight);
    const pixels = imageData.data;

    // Fill the image data
    for (let t = 0; t < numCoveredSamples; t++) {
      const elapsed = Date.now() - timer;
      if (elapsed > 30) {
        await new Promise((resolve) => setTimeout(resolve, 0)); // Yield to browser
        if (cancelHandle.canceled) return;
        timer = Date.now(); // Reset timer for next interval
      }
      for (let c = 0; c < numChannels; c++) {
        // For raw mode, use min/max pairs
        const valueMin = data[t * numChannels * 2 + c * 2];
        const valueMax = data[t * numChannels * 2 + c * 2 + 1];
        const normalizedMinValue =
          (valueMin - minValue) / (maxValue - minValue);
        const normalizedMaxValue =
          (valueMax - minValue) / (maxValue - minValue);

        // Convert to color
        const intensity1 = Math.floor(normalizedMinValue * 255);
        const intensity2 = Math.floor(normalizedMaxValue * 255);

        const color1 = [0, 85, 170]; // cool blue
        const color2 = [255, 170, 85]; // warm yellow

        const color = [
          (intensity1 * color1[0]) / 255 + (intensity2 * color2[0]) / 255,
          (intensity1 * color1[1]) / 255 + (intensity2 * color2[1]) / 255,
          (intensity1 * color1[2]) / 255 + (intensity2 * color2[2]) / 255,
          255, // Full opacity
        ];

        // Map to pixel coordinates
        const xPixel = Math.floor((t * plotWidth) / numCoveredSamples);
        const yPixel = Math.floor(
          ((numChannels - 1 - c) * plotHeight) / numChannels,
        ); // Flip Y axis

        // Fill the pixel area
        const xPixelEnd = Math.min(
          plotWidth,
          Math.floor(((t + 1) * plotWidth) / numCoveredSamples),
        );
        const yPixelEnd = Math.min(
          plotHeight,
          Math.floor(((numChannels - c) * plotHeight) / numChannels),
        );

        for (let px = xPixel; px < xPixelEnd; px++) {
          for (let py = yPixel; py < yPixelEnd; py++) {
            if (px >= 0 && px < plotWidth && py >= 0 && py < plotHeight) {
              const index = (py * plotWidth + px) * 4;
              pixels[index] = color[0]; // R
              pixels[index + 1] = color[1]; // G
              pixels[index + 2] = color[2]; // B
              pixels[index + 3] = color[3]; // A
            }
          }
        }
      }
    }

    // Draw the image data to canvas
    context.putImageData(imageData, margins.left, margins.top);

    // If overlay mode, draw spikes on top
    if (isOverlayMode && neurotileData.spikesData && spikesMaxValue > 0) {
      // Helper function to get contrasting spike color
      const getContrastingSpikeColor = (spikeCount: number): string => {
        let normalizedValue =
          (spikeCount - spikesMinValue) / (spikesMaxValue - spikesMinValue);
        const a = 1 - normalizedValue;
        normalizedValue = 1 - a * a;
        return `rgba(${Math.floor(255 * normalizedValue)}, 0, 0, 255)`;
      };

      // Draw spike rectangles on top of the bitmap
      for (let t = 0; t < numCoveredSamples; t++) {
        const elapsed = Date.now() - timer;
        if (elapsed > 30) {
          await new Promise((resolve) => setTimeout(resolve, 0)); // Yield to browser
          if (cancelHandle.canceled) return;
          timer = Date.now(); // Reset timer for next interval
        }

        for (let c = 0; c < numChannels; c++) {
          const spikeCount = neurotileData.spikesData[t * numChannels + c];

          if (spikeCount > 0) {
            // Calculate rectangle position and size
            const rectX = margins.left + (t * plotWidth) / numCoveredSamples;
            const rectY =
              margins.top + ((numChannels - 1 - c) * plotHeight) / numChannels;
            const rectWidth = plotWidth / numCoveredSamples;
            const rectHeight = plotHeight / numChannels;

            context.fillStyle = getContrastingSpikeColor(spikeCount);
            context.fillRect(rectX, rectY, rectWidth, rectHeight);
          }
        }
      }
    }
  }

  if (showRenderTime) {
    const elapsed = Date.now() - timer;
    console.info(`Elapsed time for rendering heatmap: ${elapsed} ms`);
  }
};
