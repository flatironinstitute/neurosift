import { useHdf5Group } from "@hdf5Interface";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "../common/loadingState.css";
import { ControlButton } from "../common/components/ControlButton";
import TimeseriesClient from "../simple-timeseries/TimeseriesClient";
import ChannelSelector from "./ChannelSelector";
import { colormapNames } from "./colormap";
import { computeDerived, computeWarnings } from "./derived";
import { plotMargins } from "./plotConstants";
import SpectrogramDataClient, {
  limitChannels,
  MAX_AVG_CHANNELS,
} from "./SpectrogramDataClient";
import SpectrogramWidget from "./SpectrogramWidget";
import {
  ComputeConfig,
  makeDefaultConfig,
  maxLegalK,
  modifiedFields,
  NormalizationMode,
  SpectralConfig,
  TaperMethod,
} from "./spectralConfig";
import { useSpectrogramUrlState } from "./urlState";
import { SpectrogramResult } from "./WorkerTypes";

type Props = {
  nwbUrl: string;
  path: string;
  width?: number;
  height?: number;
  condensed?: boolean;
};

const windowSizeOptions = [128, 256, 512, 1024, 2048, 4096];
const MAX_BLOCK_SAMPLES = 4_000_000;
const PER_CHANNEL_PANEL_HEIGHT = 220;
const COMPUTE_DEBOUNCE_MS = 200;

const LfpSpectrogramView: FunctionComponent<Props> = ({
  nwbUrl,
  path,
  width = 900,
  height = 560,
  condensed = false,
}) => {
  const group = useHdf5Group(nwbUrl, path);
  const [client, setClient] = useState<TimeseriesClient | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    setClient(null);
    setClientError(null);
    if (!group) return;
    TimeseriesClient.create(nwbUrl, group)
      .then((c) => !canceled && setClient(c))
      .catch((err) => !canceled && setClientError(err.message || String(err)));
    return () => {
      canceled = true;
    };
  }, [nwbUrl, group]);

  if (clientError)
    return (
      <div className="loadingContainer" style={{ color: "#e74c3c" }}>
        Error: {clientError}
      </div>
    );
  if (!group) return <div className="loadingContainer">Loading info...</div>;
  if (!client)
    return <div className="loadingContainer">Loading timeseries client...</div>;

  return (
    <LfpSpectrogramInner
      client={client}
      path={path}
      width={width}
      height={height}
      condensed={condensed}
    />
  );
};

// --- Panel: owns fetch/cache for its channel set and renders the widget ---
type PanelProps = {
  client: TimeseriesClient;
  worker: Worker;
  channels: number[];
  computeConfig: ComputeConfig;
  display: DisplayProps;
  visRange: [number, number];
  width: number;
  height: number;
  label?: string;
  onAutoLimits?: (lo: number, hi: number) => void;
};

type DisplayProps = {
  fMinHz: number;
  fMaxHz: number;
  logFreq: boolean;
  colormap: SpectralConfig["colormap"];
  normalization: NormalizationMode;
  baselineWindowSec: [number, number] | null;
  colorMinDb: number | null;
  colorMaxDb: number | null;
  useManualLimits: boolean;
  autoPercentile: number;
  symmetric: boolean;
  smoothingBoxHz: number | null;
  nyquistHz: number;
  highPassHz: number | null;
  lowPassHz: number | null;
};

const SpectrogramPanel: FunctionComponent<PanelProps> = ({
  client,
  worker,
  channels,
  computeConfig,
  display,
  visRange,
  width,
  height,
  label,
  onAutoLimits,
}) => {
  const [result, setResult] = useState<SpectrogramResult | null>(null);
  const [loading, setLoading] = useState(false);

  const channelsKey = channels.join(",");
  const dataClient = useMemo(
    () =>
      new SpectrogramDataClient(client, worker, {
        channels,
        config: computeConfig,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, worker, channelsKey, computeConfig],
  );

  const reqRef = useRef(0);
  useEffect(() => {
    if (channels.length === 0) {
      setResult(null);
      setLoading(false);
      return;
    }
    const handle = setTimeout(() => {
      const reqId = ++reqRef.current;
      setLoading(true);
      dataClient
        .getSpectrogram(visRange[0], visRange[1])
        .then((r) => {
          if (reqId !== reqRef.current) return;
          setResult(r);
          setLoading(false);
        })
        .catch(() => {
          if (reqId !== reqRef.current) return;
          setLoading(false);
        });
    }, 30);
    return () => clearTimeout(handle);
  }, [dataClient, visRange, channels.length]);

  const nyquist = result
    ? result.effectiveSamplingFrequency / 2
    : display.nyquistHz;

  return (
    <div>
      {label !== undefined && (
        <div
          style={{
            fontSize: 11,
            color: "#495057",
            padding: "2px 0 0 6px",
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      )}
      <SpectrogramWidget
        result={result}
        width={width}
        height={height}
        visibleStartTimeSec={visRange[0]}
        visibleEndTimeSec={visRange[1]}
        fMinHz={display.fMinHz}
        fMaxHz={Math.min(display.fMaxHz, nyquist)}
        logFreq={display.logFreq}
        colormap={display.colormap}
        normalization={display.normalization}
        baselineWindowSec={display.baselineWindowSec}
        colorMinDb={display.colorMinDb}
        colorMaxDb={display.colorMaxDb}
        useManualLimits={display.useManualLimits}
        autoPercentile={display.autoPercentile}
        symmetric={display.symmetric}
        onAutoLimits={onAutoLimits}
        smoothingBoxHz={display.smoothingBoxHz}
        nyquistHz={nyquist}
        highPassHz={display.highPassHz}
        lowPassHz={display.lowPassHz}
        loading={loading}
      />
    </div>
  );
};

type InnerProps = {
  client: TimeseriesClient;
  path: string;
  width: number;
  height: number;
  condensed: boolean;
};

const LfpSpectrogramInner: FunctionComponent<InnerProps> = ({
  client,
  path,
  width,
  height,
  condensed,
}) => {
  const fsNative = client.samplingFrequency;
  const nativeNyquist = fsNative / 2;
  const dataStart = client.startTime;
  const dataEnd = client.endTime;
  const totalDuration = dataEnd - dataStart;
  const numChannels = client.numChannels;

  // Settings that a shared URL restores: channels, spectral config, and the
  // visible time range. Read once at mount to seed the initial state.
  const { initial: urlInitial, persist: persistUrl } =
    useSpectrogramUrlState(path);
  const defaultVisRange = useMemo<[number, number]>(
    () => [dataStart, dataStart + Math.min(30, totalDuration || 30)],
    [dataStart, totalDuration],
  );

  const [selectedChannels, setSelectedChannels] = useState<number[]>(() =>
    urlInitial?.channels?.length ? urlInitial.channels : [0],
  );
  const [config, setConfig] = useState<SpectralConfig>(() =>
    urlInitial?.config
      ? { ...makeDefaultConfig(nativeNyquist), ...urlInitial.config }
      : makeDefaultConfig(nativeNyquist),
  );
  const [diagFlip, setDiagFlip] = useState(false);
  const [copied, setCopied] = useState(false);

  const patch = useCallback(
    (p: Partial<SpectralConfig>) => setConfig((c) => ({ ...c, ...p })),
    [],
  );

  // Debounced compute config: expensive edits don't queue a recompute per frame.
  const [debouncedConfig, setDebouncedConfig] =
    useState<SpectralConfig>(config);
  useEffect(() => {
    const h = setTimeout(() => setDebouncedConfig(config), COMPUTE_DEBOUNCE_MS);
    return () => clearTimeout(h);
  }, [config]);

  const derived = useMemo(
    () => computeDerived(config, fsNative),
    [config, fsNative],
  );
  const warnings = useMemo(
    () => computeWarnings(config, derived),
    [config, derived],
  );
  const modified = useMemo(
    () => modifiedFields(config, nativeNyquist),
    [config, nativeNyquist],
  );

  // The compute config actually sent to the worker (with the diagnostic flip).
  const effectiveCompute: ComputeConfig = useMemo(
    () => (diagFlip ? { ...debouncedConfig, taper: "hann" } : debouncedConfig),
    [debouncedConfig, diagFlip],
  );

  // Auto color-limit reporting (used when locking).
  const lastAutoRef = useRef<[number, number]>([0, 1]);
  const onAutoLimits = useCallback((lo: number, hi: number) => {
    lastAutoRef.current = [lo, hi];
  }, []);

  const [visRange, setVisRange] = useState<[number, number]>(() => {
    const v = urlInitial?.visRange;
    if (v && v.length === 2) {
      const s = Math.max(dataStart, Math.min(v[0], dataEnd));
      const e = Math.max(s, Math.min(v[1], dataEnd));
      if (e > s) return [s, e];
    }
    return defaultVisRange;
  });

  // Mirror the current view into the URL (debounced, history-replacing). When
  // everything is at its default the slot is cleared, keeping plain links tidy.
  const defaultConfigJson = useMemo(
    () => JSON.stringify(makeDefaultConfig(nativeNyquist)),
    [nativeNyquist],
  );
  useEffect(() => {
    const h = setTimeout(() => {
      const atDefault =
        JSON.stringify(config) === defaultConfigJson &&
        selectedChannels.length === 1 &&
        selectedChannels[0] === 0 &&
        visRange[0] === defaultVisRange[0] &&
        visRange[1] === defaultVisRange[1];
      persistUrl(
        atDefault ? null : { config, channels: selectedChannels, visRange },
      );
    }, 400);
    return () => clearTimeout(h);
  }, [
    config,
    selectedChannels,
    visRange,
    persistUrl,
    defaultConfigJson,
    defaultVisRange,
  ]);

  const [worker, setWorker] = useState<Worker | null>(null);
  useEffect(() => {
    const w = new Worker(new URL("./worker", import.meta.url), {
      type: "module",
    });
    setWorker(w);
    return () => {
      w.terminate();
      setWorker(null);
    };
  }, []);

  const sidebarWidth = 250;
  const plotAreaWidth = Math.max(240, width - sidebarWidth - 12);
  const plotHeight = Math.max(
    200,
    Math.round((height - (condensed ? 8 : 12)) * 0.8),
  );
  const plotW = plotAreaWidth - plotMargins.left - plotMargins.right;

  const shownChannels = useMemo(
    () => limitChannels(selectedChannels, MAX_AVG_CHANNELS),
    [selectedChannels],
  );
  const numShown = Math.max(shownChannels.length, 1);

  const maxSpan = useMemo(
    () =>
      Math.min(
        totalDuration,
        MAX_BLOCK_SAMPLES / (8 * derived.effectiveFs * numShown),
      ),
    [totalDuration, derived.effectiveFs, numShown],
  );
  const minSpan = useMemo(
    () => Math.max((config.windowSizeSamples * 4) / derived.effectiveFs, 1e-3),
    [config.windowSizeSamples, derived.effectiveFs],
  );

  const clampRange = useCallback(
    (start: number, end: number): [number, number] => {
      const span = Math.min(Math.max(end - start, minSpan), maxSpan || minSpan);
      let s = start;
      let e = s + span;
      if (e > dataEnd) {
        e = dataEnd;
        s = e - span;
      }
      if (s < dataStart) {
        s = dataStart;
        e = Math.min(s + span, dataEnd);
      }
      return [s, e];
    },
    [dataStart, dataEnd, maxSpan, minSpan],
  );

  const zoomByFactor = useCallback(
    (factor: number) =>
      setVisRange((prev) => {
        const center = (prev[0] + prev[1]) / 2;
        const s = (prev[1] - prev[0]) * factor;
        return clampRange(center - s / 2, center + s / 2);
      }),
    [clampRange],
  );
  const panByFraction = useCallback(
    (frac: number) =>
      setVisRange((prev) => {
        const dt = frac * (prev[1] - prev[0]);
        return clampRange(prev[0] + dt, prev[1] + dt);
      }),
    [clampRange],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; range: [number, number] } | null>(null);

  const timeAtClientX = useCallback(
    (clientX: number, range: [number, number]) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return range[0];
      const x = clientX - rect.left;
      const frac = Math.min(Math.max((x - plotMargins.left) / plotW, 0), 1);
      return range[0] + frac * (range[1] - range[0]);
    },
    [plotW],
  );

  // Wheeling over a spectrogram canvas zooms the time axis (in both mean and
  // split modes); wheeling anywhere else in the view is left alone so the page
  // scrolls normally to reach more channels. A non-passive listener is needed
  // so preventDefault can suppress the page scroll only while over a plot.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      const overPlot = (e.target as HTMLElement | null)?.closest?.("canvas");
      if (!overPlot) return; // let the page scroll to reveal more channels
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      setVisRange((prev) => {
        const tc = timeAtClientX(e.clientX, prev);
        const span = prev[1] - prev[0];
        const ns = span * factor;
        const frac = span > 0 ? (tc - prev[0]) / span : 0.5;
        return clampRange(tc - frac * ns, tc - frac * ns + ns);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [timeAtClientX, clampRange]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const span = drag.range[1] - drag.range[0];
      const dt = (dx / plotW) * span;
      setVisRange(clampRange(drag.range[0] - dt, drag.range[1] - dt));
    },
    [plotW, clampRange],
  );

  // Diagnostic Hann flip: lock color limits so the comparison is meaningful.
  const toggleDiagFlip = useCallback(() => {
    setDiagFlip((prev) => {
      const next = !prev;
      if (next) {
        const [lo, hi] = lastAutoRef.current;
        patch({ colorLimitLock: true, colorMinDb: lo, colorMaxDb: hi });
      }
      return next;
    });
  }, [patch]);

  const lockLimits = useCallback(() => {
    const [lo, hi] = lastAutoRef.current;
    patch({
      colorLimitLock: !config.colorLimitLock,
      colorMinDb: lo,
      colorMaxDb: hi,
    });
  }, [patch, config.colorLimitLock]);

  const copyParams = useCallback(() => {
    const clampedFmax = Math.min(config.fMaxHz, derived.nyquistHz);
    const params = {
      channels: shownChannels,
      channelMode: config.channelMode,
      referenceScheme: "raw (no re-reference)",
      samplingRateHz: fsNative,
      decimationFactor: config.decimationFactor,
      effectiveSamplingRateHz: derived.effectiveFs,
      nyquistHz: derived.nyquistHz,
      filters: {
        highPassHz: config.highPassHz,
        lowPassHz: config.lowPassHz,
        order: config.filterOrder,
        zeroPhase: config.zeroPhase,
        notch: config.notchEnabled
          ? {
              baseHz: config.notchBaseHz,
              harmonics: config.notchHarmonics,
            }
          : null,
        fTestLineRemoval: config.fTestRemove,
      },
      taper: config.taper,
      nw: config.nw,
      k: derived.effectiveK,
      waveletCycles: config.waveletCycles,
      waveletFreqDependent: config.waveletFreqDependent,
      windowSizeSamples: config.windowSizeSamples,
      windowDurationSec: derived.windowDurationSec,
      overlap: config.overlap,
      detrend: config.detrend,
      artifactThresholdSd: config.artifactThresholdSd,
      normalization: config.normalization,
      baselineWindowSec: config.baselineWindowSec,
      colorLimits: {
        mode: config.colorLimitMode,
        locked: config.colorLimitLock,
        minDb: config.colorMinDb,
        maxDb: config.colorMaxDb,
        autoPercentile: config.autoPercentile,
      },
      frequencyAxis: {
        fMinHz: config.fMinHz,
        fMaxHz: clampedFmax,
        log: config.logFreq,
        colormap: config.colormap,
      },
      derived: {
        halfBandwidthW_Hz: derived.halfBandwidthHz,
        smoothing2W_Hz: derived.smoothingBoxHz,
        K: derived.effectiveK,
        dof: derived.dof,
        nyquistHz: derived.nyquistHz,
        timeResolutionSec: derived.timeResolutionSec,
      },
    };
    const text = JSON.stringify(params, null, 2);
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      done();
    }
    console.log("Spectrogram parameters:\n" + text);
  }, [config, derived, fsNative, shownChannels]);

  const useManualLimits =
    config.colorLimitMode === "manual" || config.colorLimitLock;
  const symmetric =
    config.normalization === "baseline" || config.normalization === "zscore";

  const display: DisplayProps = {
    fMinHz: config.fMinHz,
    fMaxHz: config.fMaxHz,
    logFreq: config.logFreq,
    colormap: config.colormap,
    normalization: config.normalization,
    baselineWindowSec: config.baselineWindowSec,
    colorMinDb: config.colorMinDb,
    colorMaxDb: config.colorMaxDb,
    useManualLimits,
    autoPercentile: config.autoPercentile,
    symmetric,
    smoothingBoxHz: derived.smoothingBoxHz,
    nyquistHz: derived.nyquistHz,
    highPassHz: config.highPassHz,
    lowPassHz: config.lowPassHz,
  };

  const visSpan = visRange[1] - visRange[0];
  const eps = 1e-6;

  return (
    <div
      style={{ display: "flex", width, gap: 12, alignItems: "flex-start" }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "d" || e.key === "D") toggleDiagFlip();
      }}
    >
      <div
        style={{
          width: sidebarWidth,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "6px 4px",
          fontSize: 12,
          boxSizing: "border-box",
          maxHeight: height,
          overflowY: "auto",
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
        }}
      >
        <Section title="Channels">
          <ChannelSelector
            numChannels={numChannels}
            selected={selectedChannels}
            setSelected={setSelectedChannels}
            height={220}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "#555", fontSize: 10 }}>
              Multiple channels
              {modified.has("channelMode") && (
                <span style={{ color: "#b8860b" }}> ●</span>
              )}
            </span>
            <SegmentedToggle
              value={config.channelMode}
              options={[
                { value: "mean", label: "Average" },
                { value: "perChannel", label: "Split" },
              ]}
              onChange={(v) => patch({ channelMode: v })}
            />
          </div>
        </Section>

        <Section title="Estimator">
          <Labeled label="Taper / method" mod={modified.has("taper")}>
            <select
              value={config.taper}
              onChange={(e) => patch({ taper: e.target.value as TaperMethod })}
            >
              <option value="boxcar">none (boxcar)</option>
              <option value="hann">Hann (neutral baseline)</option>
              <option value="multitaper">DPSS multitaper</option>
              <option value="morlet">Morlet wavelet</option>
            </select>
          </Labeled>
          {config.taper === "multitaper" && (
            <div style={{ display: "flex", gap: 8 }}>
              <Labeled label="NW" mod={modified.has("nw")}>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={config.nw}
                  onChange={(e) =>
                    patch({ nw: Math.max(1, parseFloat(e.target.value) || 1) })
                  }
                  style={{ width: 60 }}
                />
              </Labeled>
              <Labeled
                label={`K (≤${maxLegalK(config.nw)})`}
                mod={modified.has("k")}
              >
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={config.k}
                  onChange={(e) =>
                    patch({ k: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  style={{ width: 60 }}
                />
              </Labeled>
            </div>
          )}
          {config.taper === "morlet" && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <Labeled label="Cycles" mod={modified.has("waveletCycles")}>
                <input
                  type="number"
                  min={2}
                  step={1}
                  value={config.waveletCycles}
                  onChange={(e) =>
                    patch({
                      waveletCycles: Math.max(
                        2,
                        parseFloat(e.target.value) || 7,
                      ),
                    })
                  }
                  style={{ width: 60 }}
                />
              </Labeled>
              <label style={{ fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={config.waveletFreqDependent}
                  onChange={(e) =>
                    patch({ waveletFreqDependent: e.target.checked })
                  }
                />{" "}
                f-dep
              </label>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Labeled
              label="Window (samp)"
              mod={modified.has("windowSizeSamples")}
            >
              <select
                value={config.windowSizeSamples}
                onChange={(e) =>
                  patch({ windowSizeSamples: parseInt(e.target.value) })
                }
              >
                {windowSizeOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Overlap" mod={modified.has("overlap")}>
              <select
                value={config.overlap}
                onChange={(e) => patch({ overlap: parseFloat(e.target.value) })}
              >
                {[0, 0.25, 0.5, 0.75, 0.9].map((o) => (
                  <option key={o} value={o}>
                    {Math.round(o * 100)}%
                  </option>
                ))}
              </select>
            </Labeled>
          </div>
          <Labeled label="Per-window detrend" mod={modified.has("detrend")}>
            <select
              value={config.detrend}
              onChange={(e) =>
                patch({ detrend: e.target.value as SpectralConfig["detrend"] })
              }
            >
              <option value="none">none</option>
              <option value="constant">constant</option>
              <option value="linear">linear</option>
            </select>
          </Labeled>
        </Section>

        <Section title="Preprocessing (off by default)">
          <div style={{ display: "flex", gap: 8 }}>
            <Labeled label="High-pass" mod={modified.has("highPassHz")}>
              <input
                type="number"
                placeholder="off"
                value={config.highPassHz ?? ""}
                onChange={(e) =>
                  patch({
                    highPassHz:
                      e.target.value === ""
                        ? null
                        : Math.max(0, parseFloat(e.target.value)),
                  })
                }
                style={{ width: 60 }}
              />
            </Labeled>
            <Labeled label="Low-pass" mod={modified.has("lowPassHz")}>
              <input
                type="number"
                placeholder="off"
                value={config.lowPassHz ?? ""}
                onChange={(e) =>
                  patch({
                    lowPassHz:
                      e.target.value === ""
                        ? null
                        : Math.max(0, parseFloat(e.target.value)),
                  })
                }
                style={{ width: 60 }}
              />
            </Labeled>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <Labeled label="Order" mod={modified.has("filterOrder")}>
              <input
                type="number"
                min={1}
                max={12}
                value={config.filterOrder}
                onChange={(e) =>
                  patch({
                    filterOrder: Math.max(1, parseInt(e.target.value) || 4),
                  })
                }
                style={{ width: 50 }}
              />
            </Labeled>
            <label style={{ fontSize: 11 }}>
              <input
                type="checkbox"
                checked={config.zeroPhase}
                onChange={(e) => patch({ zeroPhase: e.target.checked })}
              />{" "}
              zero-phase
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <label style={{ fontSize: 11 }}>
              <input
                type="checkbox"
                checked={config.notchEnabled}
                onChange={(e) => patch({ notchEnabled: e.target.checked })}
              />{" "}
              notch
            </label>
            <select
              value={config.notchBaseHz}
              onChange={(e) =>
                patch({ notchBaseHz: parseInt(e.target.value) as 50 | 60 })
              }
            >
              <option value={50}>50 Hz</option>
              <option value={60}>60 Hz</option>
            </select>
            <Labeled label="harm." mod={false}>
              <input
                type="number"
                min={1}
                max={10}
                value={config.notchHarmonics}
                onChange={(e) =>
                  patch({
                    notchHarmonics: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                style={{ width: 44 }}
              />
            </Labeled>
          </div>
          {config.taper === "multitaper" && (
            <label style={{ fontSize: 11 }}>
              <input
                type="checkbox"
                checked={config.fTestRemove}
                onChange={(e) => patch({ fTestRemove: e.target.checked })}
              />{" "}
              F-test line removal
            </label>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Labeled label="Decimate ×" mod={modified.has("decimationFactor")}>
              <input
                type="number"
                min={1}
                max={32}
                value={config.decimationFactor}
                onChange={(e) =>
                  patch({
                    decimationFactor: Math.max(
                      1,
                      parseInt(e.target.value) || 1,
                    ),
                  })
                }
                style={{ width: 50 }}
              />
            </Labeled>
            <Labeled
              label="Artifact σ"
              mod={modified.has("artifactThresholdSd")}
            >
              <input
                type="number"
                placeholder="off"
                value={config.artifactThresholdSd ?? ""}
                onChange={(e) =>
                  patch({
                    artifactThresholdSd:
                      e.target.value === ""
                        ? null
                        : Math.max(0, parseFloat(e.target.value)),
                  })
                }
                style={{ width: 50 }}
              />
            </Labeled>
          </div>
        </Section>

        <Section title="Normalization">
          <Labeled label="Mode" mod={modified.has("normalization")}>
            <select
              value={config.normalization}
              onChange={(e) => {
                const n = e.target.value as NormalizationMode;
                patch({
                  normalization: n,
                  colormap:
                    n === "baseline" || n === "zscore"
                      ? "diverging"
                      : config.colormap === "diverging"
                        ? "viridis"
                        : config.colormap,
                });
              }}
            >
              <option value="none">none / raw dB</option>
              <option value="whiten">1/f whitening</option>
              <option value="zscore">per-frequency z-score</option>
              <option value="baseline">baseline ratio</option>
            </select>
          </Labeled>
          {config.normalization === "baseline" && (
            <div style={{ fontSize: 10, color: "#666" }}>
              Baseline = current view.{" "}
              <button
                style={miniBtn}
                onClick={() =>
                  patch({ baselineWindowSec: [visRange[0], visRange[1]] })
                }
              >
                Set baseline = view
              </button>
              {config.baselineWindowSec && (
                <span>
                  {" "}
                  [{config.baselineWindowSec[0].toFixed(1)}–
                  {config.baselineWindowSec[1].toFixed(1)} s]
                </span>
              )}
            </div>
          )}
        </Section>

        <Section title="Color">
          <Labeled label="Limits" mod={modified.has("colorLimitMode")}>
            <select
              value={config.colorLimitMode}
              onChange={(e) =>
                patch({
                  colorLimitMode: e.target.value as "auto" | "manual",
                })
              }
            >
              <option value="auto">auto percentile</option>
              <option value="manual">manual</option>
            </select>
          </Labeled>
          {config.colorLimitMode === "manual" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <Labeled label="min" mod={false}>
                <input
                  type="number"
                  value={config.colorMinDb ?? ""}
                  onChange={(e) =>
                    patch({ colorMinDb: parseFloat(e.target.value) })
                  }
                  style={{ width: 56 }}
                />
              </Labeled>
              <Labeled label="max" mod={false}>
                <input
                  type="number"
                  value={config.colorMaxDb ?? ""}
                  onChange={(e) =>
                    patch({ colorMaxDb: parseFloat(e.target.value) })
                  }
                  style={{ width: 56 }}
                />
              </Labeled>
            </div>
          ) : (
            <Labeled label="percentile" mod={false}>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={config.autoPercentile}
                onChange={(e) =>
                  patch({
                    autoPercentile: Math.max(
                      0,
                      parseFloat(e.target.value) || 0,
                    ),
                  })
                }
                style={{ width: 56 }}
              />
            </Labeled>
          )}
          <label style={{ fontSize: 11 }}>
            <input
              type="checkbox"
              checked={config.colorLimitLock}
              onChange={lockLimits}
            />{" "}
            lock limits (no rescale on scroll)
          </label>
          <Labeled label="Colormap" mod={modified.has("colormap")}>
            <select
              value={config.colormap}
              onChange={(e) =>
                patch({
                  colormap: e.target.value as SpectralConfig["colormap"],
                })
              }
            >
              {colormapNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Labeled>
        </Section>

        <Section title="Frequency axis (view only)">
          <div style={{ display: "flex", gap: 8 }}>
            <Labeled label="fmin" mod={modified.has("fMinHz")}>
              <input
                type="number"
                min={0}
                value={config.fMinHz}
                onChange={(e) =>
                  patch({
                    fMinHz: Math.max(
                      0,
                      Math.min(config.fMaxHz, parseFloat(e.target.value) || 0),
                    ),
                  })
                }
                style={{ width: 56 }}
              />
            </Labeled>
            <Labeled label="fmax" mod={modified.has("fMaxHz")}>
              <input
                type="number"
                min={1}
                max={derived.nyquistHz}
                value={config.fMaxHz}
                onChange={(e) =>
                  patch({
                    fMaxHz: Math.min(
                      derived.nyquistHz,
                      Math.max(config.fMinHz, parseFloat(e.target.value) || 1),
                    ),
                  })
                }
                style={{ width: 56 }}
              />
            </Labeled>
          </div>
          <label style={{ fontSize: 11 }}>
            <input
              type="checkbox"
              checked={config.logFreq}
              onChange={(e) => patch({ logFreq: e.target.checked })}
            />{" "}
            log frequency
          </label>
        </Section>

        <Section title="Readouts">
          <Readouts derived={derived} />
        </Section>

        {warnings.length > 0 && (
          <Section title="Warnings">
            {warnings.map((w, i) => (
              <div
                key={i}
                style={{
                  fontSize: 10,
                  color: w.severity === "warn" ? "#b03030" : "#7a6000",
                  marginBottom: 3,
                }}
              >
                {w.severity === "warn" ? "⚠ " : "ⓘ "}
                {w.text}
              </div>
            ))}
          </Section>
        )}

        <Section title="Diagnostics / actions">
          <button style={btn} onClick={toggleDiagFlip}>
            {diagFlip
              ? "◀ showing Hann · Press D to untoggle"
              : "Compare against Hann · Press D to toggle"}
          </button>
          <button style={btn} onClick={copyParams}>
            {copied ? "Copied ✓" : "Copy parameters (JSON)"}
          </button>
          <button
            style={btn}
            onClick={() => {
              setConfig(makeDefaultConfig(nativeNyquist));
            }}
          >
            Reset all to defaults
          </button>
          <div style={{ fontSize: 10, color: "#666" }}>
            {modified.size === 0
              ? "All at defaults (raw power)."
              : `${modified.size} setting(s) differ from default (dotted).`}
          </div>
        </Section>
      </div>

      {/* Plot area */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "2px 0 4px",
          }}
        >
          <ControlButton
            onClick={() => zoomByFactor(0.5)}
            disabled={visSpan <= minSpan + eps}
            title="Zoom in"
          >
            🔍+
          </ControlButton>
          <ControlButton
            onClick={() => zoomByFactor(2)}
            disabled={visSpan >= maxSpan - eps}
            title="Zoom out"
          >
            🔍-
          </ControlButton>
          <ControlButton
            onClick={() => panByFraction(-0.8)}
            disabled={visRange[0] <= dataStart + eps}
            title="Scroll back"
          >
            ←
          </ControlButton>
          <ControlButton
            onClick={() => panByFraction(0.8)}
            disabled={visRange[1] >= dataEnd - eps}
            title="Scroll forward"
          >
            →
          </ControlButton>
          <ControlButton
            onClick={() =>
              setVisRange([dataStart, dataStart + Math.min(30, totalDuration)])
            }
            title="Reset view"
          >
            ⤢
          </ControlButton>
          <span style={{ fontSize: 11, color: "#555", marginLeft: 6 }}>
            window {visSpan.toFixed(2)} s · {derived.effectiveFs.toFixed(0)} Hz
            · drag / scroll over plot / buttons
          </span>
        </div>

        {diagFlip && (
          <div
            onClick={toggleDiagFlip}
            title="Click or press D to return to your configured estimator"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              marginBottom: 4,
              borderRadius: 3,
              border: "1px solid #d9a300",
              background: "#fff6d9",
              color: "#7a5b00",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span>
              ⚠ Diagnostic view — showing Hann taper, not your configured
              estimator.
            </span>
            <span style={{ fontWeight: 400 }}>Press D to return.</span>
          </div>
        )}

        {/* Framed plot window: hovering a plot zooms on wheel, while the
            padding around and the gutters between plots are safe places to
            rest the cursor and scroll the page instead. */}
        <div
          style={{
            border: "1px solid #d0d0d0",
            borderRadius: 6,
            padding: 12,
            background: "#fafafa",
            width: "fit-content",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            ref={containerRef}
            style={{
              cursor: dragRef.current ? "grabbing" : "grab",
              width: plotAreaWidth,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onMouseDown={(e) =>
              (dragRef.current = { x: e.clientX, range: visRange })
            }
            onMouseMove={handleMouseMove}
            onMouseUp={() => (dragRef.current = null)}
            onMouseLeave={() => (dragRef.current = null)}
          >
            {!worker ? null : config.channelMode === "mean" ? (
              <SpectrogramPanel
                client={client}
                worker={worker}
                channels={selectedChannels}
                computeConfig={effectiveCompute}
                display={display}
                visRange={visRange}
                width={plotAreaWidth}
                height={plotHeight}
                onAutoLimits={onAutoLimits}
              />
            ) : (
              shownChannels.map((ch) => (
                <SpectrogramPanel
                  key={ch}
                  client={client}
                  worker={worker}
                  channels={[ch]}
                  computeConfig={effectiveCompute}
                  display={display}
                  visRange={visRange}
                  width={plotAreaWidth}
                  height={PER_CHANNEL_PANEL_HEIGHT}
                  label={`Channel ${ch}`}
                  onAutoLimits={onAutoLimits}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- small UI helpers ---
const btn: React.CSSProperties = {
  padding: "5px 8px",
  border: "1px solid #dee2e6",
  borderRadius: 4,
  background: "#f8f9fa",
  cursor: "pointer",
  fontSize: 11,
  textAlign: "left",
};
const miniBtn: React.CSSProperties = {
  padding: "1px 5px",
  border: "1px solid #dee2e6",
  borderRadius: 3,
  background: "#fff",
  cursor: "pointer",
  fontSize: 10,
};

const Section: FunctionComponent<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = true }) => (
  <details open={defaultOpen} style={{ borderTop: "1px solid #eee" }}>
    <summary
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#888",
        textTransform: "uppercase",
        padding: "4px 0 3px",
        cursor: "pointer",
        listStyle: "revert",
      }}
    >
      {title}
    </summary>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        paddingBottom: 4,
      }}
    >
      {children}
    </div>
  </details>
);

const Labeled: FunctionComponent<{
  label: string;
  mod: boolean;
  children: React.ReactNode;
}> = ({ label, mod, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <span style={{ color: "#555", fontSize: 10 }}>
      {label}
      {mod && <span style={{ color: "#b8860b" }}> ●</span>}
    </span>
    {children}
  </label>
);

// A two-or-more option segmented control, backed by radio inputs for
// keyboard/accessibility while presenting as a single toggle strip.
const SegmentedToggle = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) => (
  <div
    role="radiogroup"
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      border: "1px solid #bbb",
      borderRadius: 4,
      overflow: "hidden",
    }}
  >
    {options.map((opt, i) => {
      const active = opt.value === value;
      return (
        <label
          key={opt.value}
          style={{
            boxSizing: "border-box",
            textAlign: "center",
            padding: "3px 10px",
            fontSize: 11,
            cursor: "pointer",
            background: active ? "#3573b1" : "#fff",
            color: active ? "#fff" : "#333",
            borderLeft: i === 0 ? undefined : "1px solid #bbb",
          }}
        >
          <input
            type="radio"
            checked={active}
            onChange={() => onChange(opt.value)}
            style={{
              position: "absolute",
              opacity: 0,
              width: 0,
              height: 0,
            }}
          />
          {opt.label}
        </label>
      );
    })}
  </div>
);

const Readouts: FunctionComponent<{
  derived: ReturnType<typeof computeDerived>;
}> = ({ derived: d }) => {
  const row = (k: string, v: string) => (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#666" }}>{k}</span>
      <span style={{ fontFamily: "monospace" }}>{v}</span>
    </div>
  );
  return (
    <div style={{ fontSize: 10 }}>
      {row("Time res. (T)", `${(d.timeResolutionSec * 1000).toFixed(0)} ms`)}
      {row("Nyquist", `${d.nyquistHz.toFixed(0)} Hz`)}
      {d.isMultitaper ? (
        <>
          {row("Half-bw W = NW/T", `${(d.halfBandwidthHz ?? 0).toFixed(2)} Hz`)}
          {row(
            "Smoothing 2W",
            `±${(d.halfBandwidthHz ?? 0).toFixed(2)} = ${(d.smoothingBoxHz ?? 0).toFixed(2)} Hz`,
          )}
          {row("K (max 2NW−1)", `${d.effectiveK} / ${d.maxK}`)}
          {row("DOF ≈ 2K", `${d.dof}`)}
        </>
      ) : (
        <div style={{ color: "#888" }}>(multitaper only: W, 2W, K, DOF)</div>
      )}
    </div>
  );
};

export default LfpSpectrogramView;
