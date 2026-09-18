import SpectrogramBlockCache from "./blockCache";
import TimeseriesClient from "../simple-timeseries/TimeseriesClient";
import { ComputeConfig, computeConfigKey } from "./spectralConfig";
import { SpectrogramInput, SpectrogramResult } from "./WorkerTypes";
import SpectrogramWorkerClient, {
  ComputeCanceledError,
  ComputeHandle,
} from "./workerClient";

// Target number of STFT columns computed per cached block. The visible window
// covers a quarter-to-eighth of a block, so this yields a few hundred columns
// across the view — plenty for a canvas that is then smoothly scaled.
const TARGET_COLUMNS_PER_BLOCK = 3000;

// Cap on how many channels are actually loaded and averaged, to bound compute
// and memory. If more are selected, an evenly-spaced subset is used.
export const MAX_AVG_CHANNELS = 16;

type BlockKey = string;

// Sorted, de-duplicated selection, evenly subsampled down to `max` channels.
export const limitChannels = (channels: number[], max: number): number[] => {
  const uniqueSorted = Array.from(new Set(channels)).sort((a, b) => a - b);
  if (uniqueSorted.length <= max) return uniqueSorted;
  const out: number[] = [];
  for (let i = 0; i < max; i++) {
    out.push(uniqueSorted[Math.floor((i * uniqueSorted.length) / max)]);
  }
  return Array.from(new Set(out));
};

// Snap a visible range to a cached block: a power-of-two-sized span, aligned to
// a half-block grid, that is guaranteed to fully contain the view while staying
// stable across small pans/zooms so neighbouring views reuse the same block.
const computeBlock = (
  client: TimeseriesClient,
  visStartSec: number,
  visEndSec: number,
): { blockT1: number; blockT2: number } => {
  const dataStart = client.startTime;
  const dataEnd = client.endTime;
  const visSpan = Math.max(visEndSec - visStartSec, 1e-4);

  // Block span is at least 4x the visible span (one octave of headroom on each
  // side) so panning stays within the same block.
  const octave = Math.pow(2, Math.ceil(Math.log2(visSpan)));
  const blockSpan = octave * 4;
  const grid = blockSpan / 2;

  let blockT1 = Math.floor((visStartSec - dataStart) / grid) * grid + dataStart;
  if (blockT1 < dataStart) blockT1 = dataStart;
  let blockT2 = Math.min(blockT1 + blockSpan, dataEnd);
  // Guard against a view that pokes past the block near the data end.
  if (blockT2 < visEndSec) blockT2 = Math.min(visEndSec, dataEnd);

  return { blockT1, blockT2 };
};

export type SpectrogramRequest = {
  promise: Promise<SpectrogramResult>;
  // Abandon the request: drops the fetch result and, if the worker is already
  // running this job, stops it so a newer request starts immediately.
  cancel: () => void;
};

export class SpectrogramDataClient {
  constructor(
    private client: TimeseriesClient,
    private worker: SpectrogramWorkerClient,
    private cache: SpectrogramBlockCache,
    private params: { channels: number[]; config: ComputeConfig },
  ) {}

  get startTime() {
    return this.client.startTime;
  }
  get endTime() {
    return this.client.endTime;
  }

  private keyFor(blockT1: number, blockT2: number): BlockKey {
    const { channels, config } = this.params;
    const chans = limitChannels(channels, MAX_AVG_CHANNELS).join(",");
    return `${chans}|${computeConfigKey(config)}|${blockT1.toFixed(4)}|${blockT2.toFixed(4)}`;
  }

  // Look up the block covering the given range without fetching or computing.
  peek(visStartSec: number, visEndSec: number): SpectrogramResult | undefined {
    const { blockT1, blockT2 } = computeBlock(
      this.client,
      visStartSec,
      visEndSec,
    );
    return this.cache.get(this.keyFor(blockT1, blockT2));
  }

  // Return the spectrogram block covering the given visible range, computing and
  // caching it if necessary. Repeated/adjacent calls hit the cache. The returned
  // request can be canceled while the data is loading or the worker is running.
  getSpectrogram(
    visStartSec: number,
    visEndSec: number,
    onProgress?: (fraction: number) => void,
  ): SpectrogramRequest {
    let canceled = false;
    let handle: ComputeHandle | null = null;
    const cancel = () => {
      if (canceled) return;
      canceled = true;
      handle?.cancel();
    };

    const promise = (async (): Promise<SpectrogramResult> => {
      const { blockT1, blockT2 } = computeBlock(
        this.client,
        visStartSec,
        visEndSec,
      );
      const key = this.keyFor(blockT1, blockT2);

      const cached = this.cache.get(key);
      if (cached) return cached;

      const fs = this.client.samplingFrequency;
      const { channels, config } = this.params;

      // Load each selected channel (capped) and average their power spectra.
      const useChannels = limitChannels(channels, MAX_AVG_CHANNELS);
      const signals = await Promise.all(
        useChannels.map(async (ch) => {
          const { data } = await this.client.getDataForTimeRange(
            blockT1,
            blockT2,
            ch,
            ch + 1,
          );
          return data[0] || [];
        }),
      );
      if (canceled) throw new ComputeCanceledError();

      // The worker computes the STFT at a fine analysis step over all samples and
      // averages power into this many columns (anti-aliasing the time axis).
      const input: SpectrogramInput = {
        signals,
        samplingFrequency: fs,
        signalStartTimeSec: blockT1,
        targetColumns: TARGET_COLUMNS_PER_BLOCK,
        config,
      };

      handle = this.worker.submit(input, onProgress);
      const result = await handle.promise;
      this.cache.set(key, result);
      return result;
    })();

    return { promise, cancel };
  }
}

export default SpectrogramDataClient;
