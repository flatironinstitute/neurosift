/** The pixel columns, left to right, that hold at least one event, so dense stretches read as solid. */
export const eventTickColumns = (
  times: ArrayLike<number>,
  t0: number,
  span: number,
  width: number,
): number[] => {
  if (width <= 0 || !(span > 0)) return [];
  const filled = new Uint8Array(width);
  for (let i = 0; i < times.length; i++) {
    const fraction = (times[i] - t0) / span;
    if (!(fraction >= 0 && fraction <= 1)) continue;
    filled[Math.min(Math.floor(fraction * width), width - 1)] = 1;
  }
  const columns: number[] = [];
  filled.forEach((on, column) => {
    if (on) columns.push(column);
  });
  return columns;
};

/** An SVG path of one vertical line per column, centered on the pixel. */
export const eventTicksPath = (columns: number[], height: number) =>
  columns.map((column) => `M${column + 0.5} 0v${height}`).join("");
