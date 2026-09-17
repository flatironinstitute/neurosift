import { computeSpectrogram } from "./computeSpectrogram";
import { SpectrogramInput, SpectrogramResult } from "./WorkerTypes";

// Don't flood the main thread: at most one progress message per this interval.
const PROGRESS_INTERVAL_MS = 120;

// Compute the spectrogram off the main thread so the UI stays responsive.
onmessage = (evt: MessageEvent) => {
  const { requestId, input } = evt.data as {
    requestId: number;
    input: SpectrogramInput;
  };
  let lastProgressPost = 0;
  const onProgress = (fraction: number) => {
    const now = Date.now();
    if (now - lastProgressPost < PROGRESS_INTERVAL_MS) return;
    lastProgressPost = now;
    postMessage({ requestId, progress: Math.min(Math.max(fraction, 0), 1) });
  };
  try {
    const result: SpectrogramResult = computeSpectrogram(input, onProgress);
    postMessage({ requestId, result });
  } catch (err) {
    postMessage({
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
