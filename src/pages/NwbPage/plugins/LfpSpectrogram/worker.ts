import { computeSpectrogram } from "./computeSpectrogram";
import { SpectrogramInput, SpectrogramResult } from "./WorkerTypes";

// Compute the spectrogram off the main thread so the UI stays responsive.
onmessage = (evt: MessageEvent) => {
  const { requestId, input } = evt.data as {
    requestId: number;
    input: SpectrogramInput;
  };
  try {
    const result: SpectrogramResult = computeSpectrogram(input);
    postMessage({ requestId, result });
  } catch (err) {
    postMessage({
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
