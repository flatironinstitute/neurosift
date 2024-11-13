type Tick = {
  value: number;
  major: boolean;
};

export const getTicks = (
  min: number,
  max: number,
  numPixels: number,
  targetTickSpacingPx: number,
): Tick[] => {
  const dataRange = max - min;
  if (!dataRange) return [];
  // get the step size for the ticks
  // stepSize / dataRange * numPixels ~= tickSpacingPx
  // stepSize ~= tickSpacingPx * dataRange / numPixels
  const stepSizeCandidateMinBase = Math.floor(
    Math.log10((targetTickSpacingPx * dataRange) / numPixels),
  );
  const candidateMultipliers = [1, 2, 5];
  const candidateStepSizes = candidateMultipliers.map(
    (m) => m * Math.pow(10, stepSizeCandidateMinBase),
  );
  const distances = candidateStepSizes.map((s) =>
    Math.abs(s - (targetTickSpacingPx * dataRange) / numPixels),
  );
  const bestIndex = distances.indexOf(Math.min(...distances));
  const bestStepSize = candidateStepSizes[bestIndex];

  const i1 = Math.ceil(min / bestStepSize);
  const i2 = Math.floor(max / bestStepSize);
  const ticks: Tick[] = [];
  for (let i = i1; i <= i2; i++) {
    const v = i * bestStepSize;
    ticks.push({
      value: v,
      major: false, // fix this
    });
  }
  return ticks;
};
