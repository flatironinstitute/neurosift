import { useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { SpectralConfig } from "./spectralConfig";

// A shareable snapshot of a spectrogram view: the full spectral config, the
// selected channels, and the visible time range. Persisted into the URL so a
// copied link reopens the same view with the same settings.
export type PersistedSpectrogramState = {
  config: SpectralConfig;
  channels: number[];
  visRange: [number, number];
};

const PARAM = "spec";

// The param holds a JSON object keyed by object path, so multiple spectrogram
// views in one session (e.g. a multi-view) each persist independently instead
// of clobbering a single shared slot.
type SpecMap = Record<string, PersistedSpectrogramState>;

const parseSpecMap = (raw: string | null): SpecMap => {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? (obj as SpecMap) : {};
  } catch {
    return {};
  }
};

export const useSpectrogramUrlState = (path: string) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read this path's persisted state exactly once, at mount, so later URL
  // writes never feed back into the initial values.
  const initialRef = useRef<PersistedSpectrogramState | null>(null);
  const didRead = useRef(false);
  if (!didRead.current) {
    didRead.current = true;
    initialRef.current = parseSpecMap(searchParams.get(PARAM))[path] ?? null;
  }

  // Write (or, with null, clear) this path's slot in the param, replacing the
  // history entry so panning/zooming doesn't spam the back button.
  const persist = useCallback(
    (state: PersistedSpectrogramState | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const map = parseSpecMap(next.get(PARAM));
          if (state) map[path] = state;
          else delete map[path];
          if (Object.keys(map).length > 0) next.set(PARAM, JSON.stringify(map));
          else next.delete(PARAM);
          return next;
        },
        { replace: true },
      );
    },
    [path, setSearchParams],
  );

  return { initial: initialRef.current, persist };
};
