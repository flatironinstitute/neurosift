import { formatBytes } from "@shared/util/formatBytes";
import { itemBytes } from "./Hdf5View/hdf5Tree";

const MB = 1024 * 1024;
/** No single read goes past this; views set lower limits of their own. */
export const MAX_READ_BYTES = 500 * MB;
/** One image is drawn whole, so it is read whole. */
export const MAX_IMAGE_BYTES = 50 * MB;

/** Bytes a read of `slice` (or the whole dataset) takes, assuming 8 per value when the dtype doesn't say. */
export function datasetBytes(
  shape: number[],
  dtype: string,
  slice?: [number, number][],
): number {
  const values = shape.reduce(
    (product, n, i) => product * (slice?.[i] ? slice[i][1] - slice[i][0] : n),
    1,
  );
  return values * (itemBytes(dtype) ?? 8);
}

export const tooLargeMessage = (path: string, bytes: number, limit: number) =>
  `The dataset “${path}” is too large to load (${formatBytes(bytes)}). The limit is ${formatBytes(limit)}.`;
