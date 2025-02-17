interface WaveformCanvasProps {
  context: CanvasRenderingContext2D;
  waveformData: {
    data: Float32Array;
    sampleRate: number;
    duration: number;
    channels: number;
    minValue: number;
    maxValue: number;
  };
  width: number;
  height: number;
  margins: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
}

const WaveformCanvas = ({
  context,
  waveformData,
  width,
  height,
  margins,
  visibleStartTimeSec,
  visibleEndTimeSec,
}: WaveformCanvasProps) => {
  const { data, sampleRate } = waveformData;
  const plotWidth = width - margins.left - margins.right;
  const plotHeight = height - margins.top - margins.bottom;

  // Calculate sample range for visible time window
  const startSampleIndex = Math.floor(visibleStartTimeSec * sampleRate);
  const endSampleIndex = Math.ceil(visibleEndTimeSec * sampleRate);
  const visibleSamples = endSampleIndex - startSampleIndex;
  const samplesPerPixel = Math.max(1, Math.floor(visibleSamples / plotWidth));

  // Drawing style
  context.strokeStyle = "#2196f3";
  context.lineWidth = 1;
  context.beginPath();

  // Draw the waveform
  for (let x = 0; x < plotWidth; x++) {
    // Calculate sample indices for this pixel
    const pixelStartSample = startSampleIndex + x * samplesPerPixel;
    const pixelEndSample = Math.min(
      pixelStartSample + samplesPerPixel,
      data.length,
    );

    // Find min and max values for this pixel
    let min = waveformData.maxValue;
    let max = waveformData.minValue;
    for (let i = pixelStartSample; i < pixelEndSample; i++) {
      if (i >= 0 && i < data.length) {
        const sample = data[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
    }

    // Map values from data range to plot coordinates
    const xPos = margins.left + x + 0.5;
    const scaledMin =
      margins.top +
      plotHeight *
        (1 -
          (min - waveformData.minValue) /
            (waveformData.maxValue - waveformData.minValue));
    const scaledMax =
      margins.top +
      plotHeight *
        (1 -
          (max - waveformData.minValue) /
            (waveformData.maxValue - waveformData.minValue));
    context.moveTo(xPos, scaledMin);
    context.lineTo(xPos, scaledMax);
  }

  context.stroke();
};

export default WaveformCanvas;
