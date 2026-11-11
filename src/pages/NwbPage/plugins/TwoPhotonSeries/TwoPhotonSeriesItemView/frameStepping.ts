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

export const MAX_READ_AHEAD = 32;

// Frames to read at once: one when stepping, about half a second's worth while playing.
export const framesToRead = (
  playing: boolean,
  rate: number | undefined,
  speed: number,
): number =>
  playing && rate
    ? Math.min(MAX_READ_AHEAD, Math.max(1, Math.ceil((rate * speed) / 2)))
    : 1;

export const splitFrames = <
  T extends { subarray(a: number, b: number): T; length: number },
>(
  block: T,
  first: number,
  frameSize: number,
): Map<number, T> => {
  const frames = new Map<number, T>();
  for (let k = 0; k * frameSize < block.length; k++)
    frames.set(first + k, block.subarray(k * frameSize, (k + 1) * frameSize));
  return frames;
};
