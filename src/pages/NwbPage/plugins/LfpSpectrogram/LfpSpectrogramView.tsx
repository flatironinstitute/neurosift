import { useHdf5Group } from "@hdf5Interface";
import ViewError from "@components/ViewError/ViewError";
import { useCssVars } from "@components/useCssVars";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import {
  AccordionItem,
  Button,
  Checkbox,
  DescriptionList,
  EmptyState,
  InlineMessage,
  LoadingState,
  SegmentedControl,
  Select,
  SettingPair,
  Spinner,
  useToast,
} from "@ui";
import {
  FunctionComponent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import NumberSetting from "../common/NumberSetting";
import { parseOptional } from "../common/parseOptional";
import TimeView, {
  TIME_VIEW_CHROME,
  TIME_VIEW_INSET,
  TIME_VIEW_SETTINGS,
  TIME_VIEW_TITLE,
} from "../common/TimeView";
import TimeseriesClient from "../simple-timeseries/TimeseriesClient";
import SpectrogramBlockCache from "./blockCache";
import ChannelSelector from "./ChannelSelector";
import { colormapNames } from "./colormap";
import { computeDerived, computeWarnings, DerivedReadouts } from "./derived";
import { plotMargins, PlotMargins } from "./plotConstants";
import { clampRange as clampRangeTo, zoomRangeAtAnchor } from "./zoomRange";
import SpectrogramDataClient, {
  limitChannels,
  MAX_AVG_CHANNELS,
  SpectrogramRequest,
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
import SpectrogramWorkerClient, {
  ComputeStatus,
  isComputeCanceled,
} from "./workerClient";
import { SpectrogramResult } from "./WorkerTypes";
import "./LfpSpectrogramView.css";

type Props = {
  nwbUrl: string;
  path: string;
  width?: number;
  height?: number;
  condensed?: boolean;
};

const windowSizeOptions = [128, 256, 512, 1024, 2048, 4096];
const overlapOptions = [0, 0.25, 0.5, 0.75, 0.9];
const MAX_BLOCK_SAMPLES = 4_000_000;
const PER_CHANNEL_PANEL_HEIGHT = 220;
const COMPUTE_DEBOUNCE_MS = 200;
// Don't flash a spinner for work that finishes almost immediately (cache hits).
const BUSY_INDICATOR_DELAY_MS = 150;
const RANGE_EPSILON = 1e-9;

const taperOptions: { value: TaperMethod; label: string; short: string }[] = [
  { value: "boxcar", label: "None (boxcar)", short: "Boxcar" },
  { value: "hann", label: "Hann (neutral baseline)", short: "Hann" },
  { value: "multitaper", label: "DPSS multitaper", short: "Multitaper" },
  { value: "morlet", label: "Morlet wavelet", short: "Morlet" },
];

const normalizationOptions: { value: NormalizationMode; label: string }[] = [
  { value: "none", label: "None (raw dB)" },
  { value: "whiten", label: "1/f whitening" },
  { value: "zscore", label: "Per-frequency z-score" },
  { value: "baseline", label: "Baseline ratio" },
];

const normalizationSummary: Record<NormalizationMode, string> = {
  none: "Raw dB",
  whiten: "1/f whitening",
  zscore: "Z-score",
  baseline: "Baseline ratio",
};

const powerLabel: Record<NormalizationMode, string> = {
  none: "power in dB",
  whiten: "whitened power in dB",
  zscore: "power as a per-frequency z-score",
  baseline: "power in dB against the baseline",
};

const formatNumber = (n: number, maxDigits = 2, minDigits = 0) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  });

const plural = (n: number, word: string) =>
  `${formatNumber(n, 0)} ${word}${n === 1 ? "" : "s"}`;

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
    return <ViewError what="the spectrogram" error={clientError} />;
  if (!group)
    return <LoadingState label="Reading the LFP series" phase="loading" />;
  if (!client)
    return <LoadingState label="Opening the time series" phase="loading" />;

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
  worker: SpectrogramWorkerClient;
  cache: SpectrogramBlockCache;
  channels: number[];
  computeConfig: ComputeConfig;
  display: DisplayProps;
  visRange: [number, number];
  width: number;
  height: number;
  label?: string;
  onAutoLimits?: (lo: number, hi: number) => void;
  margins: PlotMargins;
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
  cache,
  channels,
  computeConfig,
  display,
  visRange,
  width,
  height,
  label,
  onAutoLimits,
  margins,
}) => {
  // The last image we managed to compute, together with the data client that
  // produced it. Keeping it on screen while the next one is computed is what
  // makes a settings change non-blocking; comparing the client identity tells
  // us whether what is shown is stale.
  const [shown, setShown] = useState<{
    result: SpectrogramResult;
    source: SpectrogramDataClient;
  } | null>(null);
  // inFlight: a request exists right now. busy: it has been running long enough
  // that showing an indicator is worthwhile.
  const [inFlight, setInFlight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const channelsKey = channels.join(",");
  const dataClient = useMemo(
    () =>
      new SpectrogramDataClient(client, worker, cache, {
        channels,
        config: computeConfig,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, worker, cache, channelsKey, computeConfig],
  );

  useEffect(() => {
    if (channels.length === 0) {
      setShown(null);
      setInFlight(false);
      setBusy(false);
      return;
    }
    let canceled = false;
    let request: SpectrogramRequest | null = null;
    let busyTimer: ReturnType<typeof setTimeout> | null = null;

    // A cached block resolves without touching the worker, so settle it first
    // and skip the indicator entirely.
    const cached = dataClient.peek(visRange[0], visRange[1]);
    if (cached) {
      setShown({ result: cached, source: dataClient });
      setInFlight(false);
      setBusy(false);
      setProgress(null);
      setError(null);
      return;
    }

    setInFlight(true);
    const startTimer = setTimeout(() => {
      request = dataClient.getSpectrogram(
        visRange[0],
        visRange[1],
        (fraction) => {
          if (!canceled) setProgress(fraction);
        },
      );
      setProgress(null);
      setError(null);
      busyTimer = setTimeout(() => {
        if (!canceled) setBusy(true);
      }, BUSY_INDICATOR_DELAY_MS);
      request.promise
        .then((r) => {
          if (canceled) return;
          setShown({ result: r, source: dataClient });
          setInFlight(false);
          setBusy(false);
          setProgress(null);
        })
        .catch((err) => {
          if (canceled) return;
          setInFlight(false);
          setBusy(false);
          setProgress(null);
          // A canceled compute was superseded on purpose; not an error.
          if (!isComputeCanceled(err)) {
            setError(err instanceof Error ? err.message : String(err));
          }
        })
        .finally(() => {
          if (busyTimer) clearTimeout(busyTimer);
        });
    }, 30);

    return () => {
      canceled = true;
      clearTimeout(startTimer);
      if (busyTimer) clearTimeout(busyTimer);
      // Superseded: free the worker right away so the new settings are computed
      // instead of waiting behind this one.
      request?.cancel();
    };
  }, [dataClient, visRange, channels.length]);

  const result = shown?.result ?? null;
  const stale = !!shown && shown.source !== dataClient;

  const nyquist = result
    ? result.effectiveSamplingFrequency / 2
    : display.nyquistHz;

  return (
    <div className="lfp-spectrogram-panel">
      {label !== undefined && (
        <p className="lfp-spectrogram-panel-label">{label}</p>
      )}
      {error && <InlineMessage status="error">{error}</InlineMessage>}
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
        loading={inFlight}
        showBusyIndicator={busy}
        progress={progress}
        stale={stale}
        margins={margins}
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

type SectionKey =
  | "channels"
  | "estimator"
  | "preprocessing"
  | "normalization"
  | "color"
  | "frequency"
  | "readouts";

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
  const toast = useToast();

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
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    channels: true,
    estimator: false,
    preprocessing: false,
    normalization: false,
    color: false,
    frequency: false,
    readouts: false,
  });
  const section = (key: SectionKey) => ({
    open: open[key],
    onToggle: (o: boolean) => setOpen((prev) => ({ ...prev, [key]: o })),
  });

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

  // One worker client and one block cache per view. The client serializes jobs
  // and can abandon a running one, so changing a setting doesn't have to wait
  // out the computation it replaces. The cache is shared across panels and
  // across settings, so returning to a previous setting is instant.
  const [worker, setWorker] = useState<SpectrogramWorkerClient | null>(null);
  const [cache] = useState(() => new SpectrogramBlockCache());
  useEffect(() => {
    const w = new SpectrogramWorkerClient();
    setWorker(w);
    return () => {
      w.dispose();
      setWorker(null);
    };
  }, []);

  // Aggregate activity across panels, for the status beside the time window.
  const [computeStatus, setComputeStatus] = useState<ComputeStatus>({
    pending: 0,
    progress: null,
  });
  useEffect(() => {
    if (!worker) return;
    return worker.onStatusChange(setComputeStatus);
  }, [worker]);

  const plotAreaWidth = Math.max(
    240,
    width - TIME_VIEW_INSET - TIME_VIEW_SETTINGS,
  );
  const plotHeight = Math.max(200, height - TIME_VIEW_CHROME - TIME_VIEW_TITLE);
  const margins = plotMargins;
  const plotW = plotAreaWidth - margins.left - margins.right;
  const plotsRef = useCssVars<HTMLDivElement>({ "--plot-w": plotAreaWidth });

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

  const rangeBounds = useMemo(
    () => ({ dataStart, dataEnd, minSpan, maxSpan }),
    [dataStart, dataEnd, minSpan, maxSpan],
  );

  const clampRange = useCallback(
    (start: number, end: number): [number, number] =>
      clampRangeTo(start, end, rangeBounds),
    [rangeBounds],
  );

  // The visible range is the shared time selection, which the Time window and
  // overview edit; the spectrogram keeps it within the spans it can compute.
  const {
    initializeTimeseriesSelection,
    setVisibleTimeRange,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();
  const [initialVisRange] = useState<[number, number]>(() => {
    const v = urlInitial?.visRange;
    if (v && v.length === 2) {
      const s = Math.max(dataStart, Math.min(v[0], dataEnd));
      const e = Math.max(s, Math.min(v[1], dataEnd));
      if (e > s) return [s, e];
    }
    return defaultVisRange;
  });
  const restoresUrlRange = initialVisRange !== defaultVisRange;
  useEffect(() => {
    initializeTimeseriesSelection({
      startTimeSec: dataStart,
      endTimeSec: dataEnd,
      initialVisibleStartTimeSec: initialVisRange[0],
      initialVisibleEndTimeSec: initialVisRange[1],
    });
    // A shared link's range wins over one another view already set.
    if (restoresUrlRange)
      setVisibleTimeRange(initialVisRange[0], initialVisRange[1]);
  }, [
    dataStart,
    dataEnd,
    initialVisRange,
    restoresUrlRange,
    initializeTimeseriesSelection,
    setVisibleTimeRange,
  ]);

  const [visStart, visEnd] = clampRange(
    visibleStartTimeSec ?? initialVisRange[0],
    visibleEndTimeSec ?? initialVisRange[1],
  );
  const visRange = useMemo<[number, number]>(
    () => [visStart, visEnd],
    [visStart, visEnd],
  );
  useEffect(() => {
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return;
    if (
      Math.abs(visStart - visibleStartTimeSec) > RANGE_EPSILON ||
      Math.abs(visEnd - visibleEndTimeSec) > RANGE_EPSILON
    )
      setVisibleTimeRange(visStart, visEnd);
  }, [
    visStart,
    visEnd,
    visibleStartTimeSec,
    visibleEndTimeSec,
    setVisibleTimeRange,
  ]);
  // Wheel ticks arrive faster than renders, so each builds on the last one.
  const visRangeRef = useRef(visRange);
  useEffect(() => {
    visRangeRef.current = visRange;
  }, [visRange]);

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
        Math.abs(visRange[0] - defaultVisRange[0]) < RANGE_EPSILON &&
        Math.abs(visRange[1] - defaultVisRange[1]) < RANGE_EPSILON;
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; range: [number, number] } | null>(null);

  const timeAtClientX = useCallback(
    (clientX: number, range: [number, number]) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return range[0];
      const x = clientX - rect.left;
      const frac = Math.min(Math.max((x - margins.left) / plotW, 0), 1);
      return range[0] + frac * (range[1] - range[0]);
    },
    [plotW, margins],
  );

  // True only over the drawn plot area, so the side margins stay a place where
  // the wheel scrolls the page instead of zooming.
  const isOverPlotArea = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return false;
      const x = clientX - rect.left;
      return x >= margins.left && x <= margins.left + plotW;
    },
    [plotW, margins],
  );

  // Wheeling over the plot area zooms the time axis (in both mean and split
  // modes); wheeling over the side margins, the gutters between panels, or
  // anywhere else in the view is left alone so the page scrolls normally to
  // reach more channels. A non-passive listener is needed so preventDefault can
  // suppress the page scroll only while over a plot.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      const overPlot = (e.target as HTMLElement | null)?.closest?.("canvas");
      if (!overPlot) return; // let the page scroll to reveal more channels
      if (!isOverPlotArea(e.clientX)) return; // side margins scroll the page
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const prev = visRangeRef.current;
      // Null at a zoom limit, where the wheel must not move the window at all;
      // see zoomRangeAtAnchor.
      const next = zoomRangeAtAnchor(
        prev,
        factor,
        timeAtClientX(e.clientX, prev),
        rangeBounds,
      );
      if (!next) return;
      visRangeRef.current = next;
      setVisibleTimeRange(next[0], next[1]);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [timeAtClientX, isOverPlotArea, rangeBounds, setVisibleTimeRange]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const span = drag.range[1] - drag.range[0];
      const dt = (dx / plotW) * span;
      const [s, end] = clampRange(drag.range[0] - dt, drag.range[1] - dt);
      setVisibleTimeRange(s, end);
    },
    [plotW, clampRange, setVisibleTimeRange],
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
    const copied = () =>
      toast.show({ status: "success", message: "Settings copied" });
    const failed = () =>
      toast.show({
        status: "error",
        message: "Couldn't copy the settings; they are in the browser console",
      });
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(copied, failed);
    } else {
      failed();
    }
    console.log("Spectrogram parameters:\n" + text);
  }, [config, derived, fsNative, shownChannels, toast]);

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

  // Hold the status back briefly so quick recomputations (cache hits while
  // panning) don't make it blink.
  const showComputing = useDelayedFlag(
    computeStatus.pending > 0,
    BUSY_INDICATOR_DELAY_MS,
  );

  const name = path.split("/").filter(Boolean).pop() || path;
  const summary = `${formatNumber(dataStart, 2, 2)}–${formatNumber(dataEnd, 2, 2)} s · ${formatNumber(fsNative)} Hz · ${plural(numChannels, "channel")}`;
  const clampedFmax = Math.min(config.fMaxHz, derived.nyquistHz);
  const taperShort = (t: TaperMethod) =>
    taperOptions.find((o) => o.value === t)?.short ?? t;

  return (
    <div
      ref={plotsRef}
      className="lfp-spectrogram"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "d" || e.key === "D") && !isTextEntry(e.target))
          toggleDiagFlip();
      }}
    >
      <TimeView
        label={name}
        summary={summary}
        busy={showComputing}
        condensed={condensed}
        chartTitle={chartTitle(shownChannels, config.channelMode, {
          ...effectiveCompute,
          normalization: config.normalization,
        })}
        controls={
          showComputing && (
            <span
              className="lfp-spectrogram-status"
              title="Spectrograms are being computed in the background. Changing a setting cancels the work it replaces."
            >
              <Spinner />
              Computing
              {computeStatus.progress != null && computeStatus.progress > 0
                ? ` ${Math.round(computeStatus.progress * 100)}%`
                : "…"}
              {computeStatus.pending > 1
                ? ` · ${computeStatus.pending - 1} queued`
                : ""}
            </span>
          )
        }
        settings={
          <>
            <AccordionItem
              title="Channels"
              summary={`${selectedChannels.length} of ${numChannels} · ${config.channelMode === "mean" ? "average" : "split"}`}
              {...section("channels")}
            >
              <ChannelSelector
                numChannels={numChannels}
                selected={selectedChannels}
                setSelected={setSelectedChannels}
              />
              <SegmentedControl
                label="Multiple channels"
                size="sm"
                value={config.channelMode}
                onChange={(v) =>
                  patch({ channelMode: v as SpectralConfig["channelMode"] })
                }
                options={[
                  { value: "mean", label: "Average" },
                  { value: "perChannel", label: "Split" },
                ]}
              />
            </AccordionItem>

            <AccordionItem
              title="Estimator"
              summary={[
                taperShort(config.taper),
                formatNumber(config.windowSizeSamples),
                `${Math.round(config.overlap * 100)}%`,
                config.detrend !== "none" && `${config.detrend} detrend`,
              ]
                .filter(Boolean)
                .join(" · ")}
              {...section("estimator")}
            >
              <Select
                label="Method"
                size="sm"
                value={config.taper}
                onChange={(v) => patch({ taper: v as TaperMethod })}
                options={taperOptions}
              />
              {config.taper === "multitaper" && (
                <SettingPair>
                  <NumberSetting
                    label="NW"
                    value={config.nw}
                    onChange={(t) =>
                      patch({ nw: Math.max(1, parseFloat(t) || 1) })
                    }
                  />
                  <NumberSetting
                    label={`Tapers K (max ${maxLegalK(config.nw)})`}
                    value={config.k}
                    onChange={(t) =>
                      patch({ k: Math.max(1, parseInt(t) || 1) })
                    }
                  />
                </SettingPair>
              )}
              {config.taper === "morlet" && (
                <>
                  <NumberSetting
                    label="Cycles"
                    value={config.waveletCycles}
                    onChange={(t) =>
                      patch({
                        waveletCycles: Math.max(2, parseFloat(t) || 7),
                      })
                    }
                  />
                  <Checkbox
                    label="Scale cycles with frequency"
                    checked={config.waveletFreqDependent}
                    onChange={(c) => patch({ waveletFreqDependent: c })}
                  />
                </>
              )}
              <SettingPair>
                <Select
                  label="Window (samples)"
                  size="sm"
                  value={String(config.windowSizeSamples)}
                  onChange={(v) => patch({ windowSizeSamples: parseInt(v) })}
                  options={windowSizeOptions.map((w) => ({
                    value: String(w),
                    label: formatNumber(w),
                  }))}
                />
                <Select
                  label="Overlap"
                  size="sm"
                  value={String(config.overlap)}
                  onChange={(v) => patch({ overlap: parseFloat(v) })}
                  options={overlapOptions.map((o) => ({
                    value: String(o),
                    label: `${Math.round(o * 100)}%`,
                  }))}
                />
              </SettingPair>
              <Select
                label="Detrend each window"
                size="sm"
                value={config.detrend}
                onChange={(v) =>
                  patch({ detrend: v as SpectralConfig["detrend"] })
                }
                options={[
                  { value: "none", label: "None" },
                  { value: "constant", label: "Constant" },
                  { value: "linear", label: "Linear" },
                ]}
              />
            </AccordionItem>

            <AccordionItem
              title="Preprocessing"
              summary={preprocessingSummary(config)}
              {...section("preprocessing")}
            >
              <SettingGroup title="Band-pass filter">
                <SettingPair>
                  <NumberSetting
                    label="High-pass (Hz)"
                    placeholder="Off"
                    value={config.highPassHz}
                    onChange={(t) => patch({ highPassHz: nonNegative(t) })}
                  />
                  <NumberSetting
                    label="Low-pass (Hz)"
                    placeholder="Off"
                    value={config.lowPassHz}
                    onChange={(t) => patch({ lowPassHz: nonNegative(t) })}
                  />
                </SettingPair>
                <NumberSetting
                  label="Filter order"
                  value={config.filterOrder}
                  onChange={(t) =>
                    patch({ filterOrder: Math.max(1, parseInt(t) || 4) })
                  }
                />
                <Checkbox
                  label="Zero-phase"
                  checked={config.zeroPhase}
                  onChange={(c) => patch({ zeroPhase: c })}
                />
              </SettingGroup>
              <SettingGroup title="Line noise">
                <Checkbox
                  label="Notch filter"
                  checked={config.notchEnabled}
                  onChange={(c) => patch({ notchEnabled: c })}
                />
                <SettingPair>
                  <Select
                    label="Mains"
                    size="sm"
                    value={String(config.notchBaseHz)}
                    onChange={(v) =>
                      patch({ notchBaseHz: parseInt(v) as 50 | 60 })
                    }
                    options={[
                      { value: "50", label: "50 Hz" },
                      { value: "60", label: "60 Hz" },
                    ]}
                  />
                  <NumberSetting
                    label="Harmonics"
                    value={config.notchHarmonics}
                    onChange={(t) =>
                      patch({ notchHarmonics: Math.max(1, parseInt(t) || 1) })
                    }
                  />
                </SettingPair>
                {config.taper === "multitaper" && (
                  <Checkbox
                    label="F-test line removal"
                    checked={config.fTestRemove}
                    onChange={(c) => patch({ fTestRemove: c })}
                  />
                )}
              </SettingGroup>
              <SettingGroup title="Speed and artifacts">
                <SettingPair>
                  <NumberSetting
                    label="Decimate by"
                    value={config.decimationFactor}
                    onChange={(t) =>
                      patch({
                        decimationFactor: Math.max(1, parseInt(t) || 1),
                      })
                    }
                  />
                  <NumberSetting
                    label="Artifact threshold (σ)"
                    placeholder="Off"
                    value={config.artifactThresholdSd}
                    onChange={(t) =>
                      patch({ artifactThresholdSd: nonNegative(t) })
                    }
                  />
                </SettingPair>
              </SettingGroup>
            </AccordionItem>

            <AccordionItem
              title="Normalization"
              summary={normalizationSummary[config.normalization]}
              {...section("normalization")}
            >
              <Select
                label="Mode"
                size="sm"
                value={config.normalization}
                onChange={(v) => {
                  const n = v as NormalizationMode;
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
                options={normalizationOptions}
              />
              {config.normalization === "baseline" && (
                <>
                  <p className="lfp-spectrogram-note">
                    {config.baselineWindowSec
                      ? `Baseline: ${formatNumber(config.baselineWindowSec[0], 1, 1)}–${formatNumber(config.baselineWindowSec[1], 1, 1)} s`
                      : "No baseline set yet."}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      patch({ baselineWindowSec: [visRange[0], visRange[1]] })
                    }
                  >
                    Use the current view as baseline
                  </Button>
                </>
              )}
            </AccordionItem>

            <AccordionItem
              title="Color"
              summary={`${
                config.colorLimitLock
                  ? "Locked"
                  : config.colorLimitMode === "manual"
                    ? `${config.colorMinDb ?? "?"} to ${config.colorMaxDb ?? "?"} dB`
                    : "Auto"
              } · ${config.colormap}`}
              {...section("color")}
            >
              <Select
                label="Limits"
                size="sm"
                value={config.colorLimitMode}
                onChange={(v) =>
                  patch({ colorLimitMode: v as "auto" | "manual" })
                }
                options={[
                  { value: "auto", label: "Auto percentile" },
                  { value: "manual", label: "Manual" },
                ]}
              />
              {config.colorLimitMode === "manual" ? (
                <SettingPair>
                  <NumberSetting
                    label="Min (dB)"
                    value={config.colorMinDb}
                    onChange={(t) => patch({ colorMinDb: parseOptional(t) })}
                  />
                  <NumberSetting
                    label="Max (dB)"
                    value={config.colorMaxDb}
                    onChange={(t) => patch({ colorMaxDb: parseOptional(t) })}
                  />
                </SettingPair>
              ) : (
                <NumberSetting
                  label="Clip percentile (%)"
                  value={config.autoPercentile}
                  onChange={(t) =>
                    patch({ autoPercentile: Math.max(0, parseFloat(t) || 0) })
                  }
                />
              )}
              <Checkbox
                label="Lock limits (no rescale on scroll)"
                checked={config.colorLimitLock}
                onChange={lockLimits}
              />
              <Select
                label="Colormap"
                size="sm"
                value={config.colormap}
                onChange={(v) =>
                  patch({ colormap: v as SpectralConfig["colormap"] })
                }
                options={colormapNames.map((c) => ({ value: c, label: c }))}
              />
            </AccordionItem>

            <AccordionItem
              title="Frequency axis"
              summary={`${formatNumber(config.fMinHz)} to ${formatNumber(clampedFmax)} Hz · ${config.logFreq ? "log" : "linear"}`}
              {...section("frequency")}
            >
              <SettingPair>
                <NumberSetting
                  label="Lowest (Hz)"
                  value={config.fMinHz}
                  onChange={(t) =>
                    patch({
                      fMinHz: Math.max(
                        0,
                        Math.min(config.fMaxHz, parseFloat(t) || 0),
                      ),
                    })
                  }
                />
                <NumberSetting
                  label="Highest (Hz)"
                  value={config.fMaxHz}
                  onChange={(t) =>
                    patch({
                      fMaxHz: Math.min(
                        derived.nyquistHz,
                        Math.max(config.fMinHz, parseFloat(t) || 1),
                      ),
                    })
                  }
                />
              </SettingPair>
              <Checkbox
                label="Log frequency"
                checked={config.logFreq}
                onChange={(c) => patch({ logFreq: c })}
              />
            </AccordionItem>

            <AccordionItem
              title="Readouts"
              summary={`${formatNumber(derived.timeResolutionSec)} s · ${formatNumber(derived.nyquistHz, 0)} Hz`}
              {...section("readouts")}
            >
              <Readouts derived={derived} />
              {warnings.map((w) => (
                <InlineMessage
                  key={w.text}
                  status={w.severity === "warn" ? "warning" : "info"}
                >
                  {w.text}
                </InlineMessage>
              ))}
            </AccordionItem>

            <div className="lfp-spectrogram-actions">
              <Button
                variant="secondary"
                size="sm"
                aria-pressed={diagFlip}
                onClick={toggleDiagFlip}
              >
                {diagFlip
                  ? "Back to your estimator (D)"
                  : "Compare with Hann (D)"}
              </Button>
              <Button variant="ghost" size="sm" onClick={copyParams}>
                Copy settings as JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={modified.size === 0}
                onClick={() => setConfig(makeDefaultConfig(nativeNyquist))}
              >
                Reset all to defaults
              </Button>
            </div>
          </>
        }
      >
        {selectedChannels.length === 0 ? (
          <EmptyState title="No channels picked">
            Pick one or more channels in Channels.
          </EmptyState>
        ) : (
          <div
            ref={containerRef}
            className="lfp-spectrogram-plots"
            onMouseDown={(e) =>
              (dragRef.current = { x: e.clientX, range: visRange })
            }
            onMouseMove={handleMouseMove}
            onMouseUp={() => (dragRef.current = null)}
            onMouseLeave={() => (dragRef.current = null)}
          >
            {diagFlip && (
              <InlineMessage status="warning">
                Showing a Hann window, not your estimator, to compare. Press D
                to return.
              </InlineMessage>
            )}
            {!worker ? null : config.channelMode === "mean" ? (
              <SpectrogramPanel
                client={client}
                worker={worker}
                cache={cache}
                channels={selectedChannels}
                computeConfig={effectiveCompute}
                display={display}
                visRange={visRange}
                width={plotAreaWidth}
                height={plotHeight}
                onAutoLimits={onAutoLimits}
                margins={margins}
              />
            ) : (
              shownChannels.map((ch) => (
                <SpectrogramPanel
                  key={ch}
                  client={client}
                  worker={worker}
                  cache={cache}
                  channels={[ch]}
                  computeConfig={effectiveCompute}
                  display={display}
                  visRange={visRange}
                  width={plotAreaWidth}
                  height={PER_CHANNEL_PANEL_HEIGHT}
                  label={`Channel ${ch}`}
                  onAutoLimits={onAutoLimits}
                  margins={margins}
                />
              ))
            )}
          </div>
        )}
      </TimeView>
    </div>
  );
};

// Report `active` only once it has stayed true for `delayMs`, so short-lived
// work doesn't flash an indicator on screen.
const useDelayedFlag = (active: boolean, delayMs: number): boolean => {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const h = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(h);
  }, [active, delayMs]);
  return shown;
};

/** Typing a "d" into a field must not flip the estimator. */
const isTextEntry = (target: EventTarget) =>
  target instanceof HTMLElement &&
  target.matches(
    'input:not([type="checkbox"]):not([type="radio"]), textarea, select',
  );

const nonNegative = (text: string) => {
  const n = parseOptional(text);
  return n === null ? null : Math.max(0, n);
};

const chartTitle = (
  channels: number[],
  mode: SpectralConfig["channelMode"],
  c: ComputeConfig & { normalization: NormalizationMode },
) => {
  const which =
    channels.length === 1
      ? `Channel ${channels[0]}`
      : mode === "mean"
        ? `Average of ${channels.length} channels`
        : `${channels.length} channels, split`;
  const samples = `${formatNumber(c.windowSizeSamples)} samples`;
  const estimator = {
    boxcar: `Boxcar window, ${samples}`,
    hann: `Hann window, ${samples}`,
    multitaper: `DPSS multitaper (NW ${c.nw}, K ${c.k}), ${samples}`,
    morlet: `Morlet wavelet, ${c.waveletCycles} cycles`,
  }[c.taper];
  return `${which} · ${estimator} · ${powerLabel[c.normalization]}`;
};

const preprocessingSummary = (c: SpectralConfig) => {
  const hp = c.highPassHz;
  const lp = c.lowPassHz;
  const parts = [
    hp != null && lp != null
      ? `Band-pass ${formatNumber(hp)}–${formatNumber(lp)} Hz`
      : hp != null
        ? `High-pass ${formatNumber(hp)} Hz`
        : lp != null && `Low-pass ${formatNumber(lp)} Hz`,
    c.notchEnabled &&
      `Notch ${c.notchBaseHz} Hz · ${plural(c.notchHarmonics, "harmonic")}`,
    c.taper === "multitaper" && c.fTestRemove && "F-test line removal",
    c.decimationFactor > 1 && `Decimate by ${c.decimationFactor}`,
    c.artifactThresholdSd != null &&
      `Artifacts over ${formatNumber(c.artifactThresholdSd)} σ`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Off";
};

const SettingGroup: FunctionComponent<{
  title: string;
  children: ReactNode;
}> = ({ title, children }) => (
  <fieldset className="lfp-spectrogram-group">
    <legend className="lfp-spectrogram-group-title">{title}</legend>
    {children}
  </fieldset>
);

const Readouts: FunctionComponent<{ derived: DerivedReadouts }> = ({
  derived: d,
}) => (
  <>
    <DescriptionList
      label="Readouts"
      items={[
        {
          term: "Time resolution",
          value: `${formatNumber(d.timeResolutionSec, 3)} s`,
          code: true,
        },
        {
          term: "Highest frequency (Nyquist)",
          value: `${formatNumber(d.nyquistHz, 0)} Hz`,
          code: true,
        },
        ...(d.isMultitaper
          ? [
              {
                term: "Half-bandwidth W = NW/T",
                value: `${(d.halfBandwidthHz ?? 0).toFixed(2)} Hz`,
                code: true,
              },
              {
                term: "Smoothing 2W",
                value: `±${(d.halfBandwidthHz ?? 0).toFixed(2)} = ${(d.smoothingBoxHz ?? 0).toFixed(2)} Hz`,
                code: true,
              },
              {
                term: "Tapers K (max 2NW−1)",
                value: `${d.effectiveK} of ${d.maxK}`,
                code: true,
              },
              {
                term: "Degrees of freedom ≈ 2K",
                value: `${d.dof}`,
                code: true,
              },
            ]
          : []),
      ]}
    />
    {!d.isMultitaper && (
      <p className="lfp-spectrogram-note">
        Bandwidth, tapers and degrees of freedom are reported for the DPSS
        multitaper method.
      </p>
    )}
  </>
);

export default LfpSpectrogramView;
