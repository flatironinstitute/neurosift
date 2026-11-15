/** Values drawn at once before the view asks to zoom in or draw anyway. */
export const MAX_DRAWN_VALUES = 1e6;

/** Whether the window holds more than the view draws without asking. */
export function tooMuchToDraw({
  duration,
  channels,
  samplingFrequency,
  acceptedDuration,
}: {
  duration: number;
  channels: number;
  samplingFrequency: number;
  /** The widest window drawn anyway, in seconds. */
  acceptedDuration: number;
}): boolean {
  const maxDuration = MAX_DRAWN_VALUES / (channels || 1) / samplingFrequency;
  return duration > Math.max(maxDuration, acceptedDuration);
}
