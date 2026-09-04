// Frame navigation for image series: steps are clamped to the frames that
// exist, so a click on "Next" at the last frame (or "Previous" at the
// first) never asks the data layer for a frame outside the dataset.

export const clampFrameIndex = (index: number, numFrames: number): number => {
  if (numFrames <= 0) return 0;
  return Math.min(Math.max(index, 0), numFrames - 1);
};

// The frame reached by stepping `inc` frames from `current`, or undefined
// when the step would not move (already at the boundary, or nothing known).
export const steppedFrameIndex = (
  current: number | undefined,
  inc: number,
  numFrames: number | undefined,
): number | undefined => {
  if (current === undefined || numFrames === undefined) return undefined;
  const next = clampFrameIndex(current + inc, numFrames);
  return next === current ? undefined : next;
};

export const canStepFrame = (
  current: number | undefined,
  inc: number,
  numFrames: number | undefined,
): boolean => steppedFrameIndex(current, inc, numFrames) !== undefined;
