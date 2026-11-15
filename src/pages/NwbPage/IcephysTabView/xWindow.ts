/**
 * The within-sweep x-window crop (ms), shared across panels. A reversed or empty
 * window isn't swapped; it gets an error so the mistake shows instead of being guessed at.
 */
export const parseXWindow = (startText: string, endText: string) => {
  const start = parseFloat(startText);
  const end = parseFloat(endText);
  const bothSet = startText.trim() !== "" && endText.trim() !== "";
  const numbers = Number.isFinite(start) && Number.isFinite(end);
  const error = !bothSet
    ? null
    : !numbers
      ? "Window bounds must be numbers."
      : start >= end
        ? "Window start must be before the end."
        : null;
  const range: [number, number] | null =
    numbers && end > start ? [start, end] : null;
  return { range, error };
};
