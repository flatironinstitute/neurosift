export const findClosestFrameIndex = (
  timestamps: number[],
  targetTime: number
): number => {
  let closestIndex = 0;
  let minDiff = Math.abs(timestamps[0] - targetTime);
  
  for (let i = 1; i < timestamps.length; i++) {
    const diff = Math.abs(timestamps[i] - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  
  return closestIndex;
};

export const applyConfidenceThreshold = (
  confidence: number,
  threshold: number
): boolean => {
  return confidence >= threshold;
};

export const confidenceToOpacity = (
  confidence: number,
  minOpacity: number = 0.3,
  maxOpacity: number = 1.0
): number => {
  return minOpacity + (maxOpacity - minOpacity) * confidence;
};

export const confidenceToColor = (
  confidence: number
): string => {
  // Red (0) -> Yellow (0.5) -> Green (1.0)
  if (confidence < 0.5) {
    const t = confidence * 2;
    const r = 255;
    const g = Math.round(255 * t);
    return `rgb(${r}, ${g}, 0)`;
  } else {
    const t = (confidence - 0.5) * 2;
    const r = Math.round(255 * (1 - t));
    const g = 255;
    return `rgb(${r}, ${g}, 0)`;
  }
};
