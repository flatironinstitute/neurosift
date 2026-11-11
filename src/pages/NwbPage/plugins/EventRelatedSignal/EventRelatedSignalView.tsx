import { getHdf5DatasetData, getHdf5Group } from "@hdf5Interface";
import {
  FunctionComponent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNeurodataObjects } from "../../useNeurodataObjects";
import AlignToSelectionComponent from "../PSTH/PSTHItemView/components/AlignToSelection";
import GroupBySelectionComponent from "../PSTH/PSTHItemView/components/GroupBySelection";
import { useCategoricalOptions } from "../PSTH/PSTHItemView/hooks/useGroupByCategories";
import TrialAlignedSeriesWidget from "../PSTH/PSTHItemView/TrialAlignedSeriesWidget";
import TimeseriesClient from "../simple-timeseries/TimeseriesClient";
import {
  isTimeSeriesLikeGroup,
  timeSeriesSamplesPerChannel,
} from "./detection";
import {
  AlignedTrial,
  loadEventRelatedSnippets,
  plottedRowIndexes,
} from "./loadEventRelatedSnippets";
import "./EventRelatedSignalView.css";
import {
  AccordionItem,
  Checkbox,
  EmptyState,
  InlineMessage,
  LoadingState,
  Select,
  SegmentedControl,
  SettingPair,
  Slider,
  TextInput,
  ViewPanel,
} from "@ui";
import ViewError from "@components/ViewError/ViewError";
import { useCssVars } from "@components/useCssVars";

type Props = {
  nwbUrl: string;
  path: string; // the TimeIntervals table
  secondaryPaths?: string[]; // [timeseriesPath]
  width?: number;
  height?: number;
  condensed?: boolean;
};

const DEFAULT_MAX_INTERVALS = 200;
const DEFAULT_WINDOW = { start: -2.5, end: 5 };

const seriesColor = "#1f77b4";

const groupPalette = [
  "#1f77b4",
  "#d62728",
  "#2ca02c",
  "#9467bd",
  "#ff7f0e",
  "#17becf",
  "#e377c2",
  "#8c564b",
  "#bcbd22",
  "#7f7f7f",
];
const colorForGroupIndex = (i: number) => groupPalette[i % groupPalette.length];

const shortName = (path: string) =>
  path.split("/").filter(Boolean).pop() || path;

const parentPath = (path: string) =>
  path.split("/").slice(0, -1).join("/") || "/";

// Label each series by its short name, disambiguating any names shared by more
// than one series with the parenthesized parent location.
const buildSeriesLabels = (paths: string[]): { [path: string]: string } => {
  const counts: { [name: string]: number } = {};
  for (const p of paths) {
    const n = shortName(p);
    counts[n] = (counts[n] || 0) + 1;
  }
  const labels: { [path: string]: string } = {};
  for (const p of paths) {
    const n = shortName(p);
    labels[p] = counts[n] > 1 ? `${n} (${parentPath(p)})` : n;
  }
  return labels;
};

// The view persists its main selections in the URL hash (like the PSTH view) so
// a link or reload restores them. Keys are prefixed to avoid colliding with
// other views' hash params.
const readHashParams = (): URLSearchParams => {
  const h = window.location.hash;
  return new URLSearchParams(h.startsWith("#") ? h.slice(1) : h);
};

const EventRelatedSignalView: FunctionComponent<Props> = ({
  nwbUrl,
  path,
  secondaryPaths,
  width = 800,
  height = 800,
}) => {
  const { neurodataObjects } = useNeurodataObjects(nwbUrl);

  // All timeseries-like objects in the file are candidate series to align,
  // ordered ascending by amount of data per channel so the lightest (fastest to
  // render) is first.
  const seriesOptions = useMemo(
    () =>
      neurodataObjects
        .filter((o) => o.group && isTimeSeriesLikeGroup(o.group.datasets))
        .sort(
          (a, b) =>
            timeSeriesSamplesPerChannel(a.group!.datasets) -
            timeSeriesSamplesPerChannel(b.group!.datasets),
        )
        .map((o) => o.path),
    [neurodataObjects],
  );

  const initialSeries = secondaryPaths && secondaryPaths[0];
  const [selectedSeriesPath, setSelectedSeriesPath] = useState<
    string | undefined
  >(() => readHashParams().get("ta_series") || initialSeries);

  // Once the object list is known, make sure a valid series is selected.
  useEffect(() => {
    if (selectedSeriesPath && seriesOptions.includes(selectedSeriesPath))
      return;
    if (initialSeries && seriesOptions.includes(initialSeries)) {
      setSelectedSeriesPath(initialSeries);
      return;
    }
    // Keep an externally-provided series even before the object list resolves.
    if (initialSeries && seriesOptions.length === 0) return;
    if (seriesOptions.length > 0) setSelectedSeriesPath(seriesOptions[0]);
  }, [seriesOptions, initialSeries, selectedSeriesPath]);

  if (!selectedSeriesPath) {
    if (seriesOptions.length === 0 && neurodataObjects.length > 0) {
      return (
        <EmptyState title="No time series to align">
          This file has no TimeSeries this view can align to its intervals.
        </EmptyState>
      );
    }
    return <LoadingState label="Finding time series" phase="loading" />;
  }

  return (
    <EventRelatedSignalInner
      nwbUrl={nwbUrl}
      intervalsPath={path}
      seriesPath={selectedSeriesPath}
      seriesOptions={seriesOptions}
      setSeriesPath={setSelectedSeriesPath}
      width={width}
      height={height}
    />
  );
};

type InnerProps = {
  nwbUrl: string;
  intervalsPath: string;
  seriesPath: string;
  seriesOptions: string[];
  setSeriesPath: (p: string) => void;
  width: number;
  height: number;
};

type CommittedParams = {
  windowRange: { start: number; end: number };
  maxIntervals: number;
};

type Group = { group: string; color: string };

const EventRelatedSignalInner: FunctionComponent<InnerProps> = ({
  nwbUrl,
  intervalsPath,
  seriesPath,
  seriesOptions,
  setSeriesPath,
  width,
  height,
}) => {
  // Load a client for the selected series. Keep the previous client visible
  // while a new series loads so the controls and existing plots don't flicker.
  const [client, setClient] = useState<TimeseriesClient | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    setClientError(null);
    (async () => {
      try {
        const group = await getHdf5Group(nwbUrl, seriesPath);
        if (!group) throw new Error(`Unable to load group: ${seriesPath}`);
        const c = await TimeseriesClient.create(nwbUrl, group);
        if (!canceled) setClient(c);
      } catch (err) {
        if (!canceled) {
          setClient(null);
          setClientError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, seriesPath]);

  const numChannels = client ? client.numChannels : 1;

  // Channel and align-to selections apply live (like the PSTH unit selector).
  const [selectedChannels, setSelectedChannels] = useState<number[]>(() => {
    const v = readHashParams().get("ta_channels");
    if (v) {
      const arr = v
        .split(",")
        .map((x) => parseInt(x))
        .filter((n) => Number.isInteger(n) && n >= 0);
      if (arr.length > 0) return arr;
    }
    return [0];
  });
  const [alignToVariables, setAlignToVariables] = useState<string[]>(() => {
    const v = readHashParams().get("ta_align");
    return v ? v.split(",").filter(Boolean) : ["start_time"];
  });

  // Keep the channel selection within range when the series changes.
  useEffect(() => {
    if (!client) return;
    setSelectedChannels((prev) => {
      const filtered = prev.filter((c) => c < client.numChannels);
      return filtered.length > 0 ? filtered : [0];
    });
  }, [client]);

  // Window range and max intervals reload the snippet data.
  const [windowRangeStr, setWindowRangeStr] = useState<{
    start: string;
    end: string;
  }>(() => {
    const v = readHashParams().get("ta_win");
    if (v) {
      const parts = v.split(",");
      if (parts.length === 2) return { start: parts[0], end: parts[1] };
    }
    return {
      start: String(DEFAULT_WINDOW.start),
      end: String(DEFAULT_WINDOW.end),
    };
  });
  const [maxIntervalsStr, setMaxIntervalsStr] = useState(
    () => readHashParams().get("ta_max") || String(DEFAULT_MAX_INTERVALS),
  );
  const [committed, setCommitted] = useState<CommittedParams>(() => {
    const p = readHashParams();
    let start = DEFAULT_WINDOW.start;
    let end = DEFAULT_WINDOW.end;
    const w = p.get("ta_win");
    if (w) {
      const [s, e] = w.split(",").map(Number);
      if (isFinite(s) && isFinite(e) && e > s) {
        start = s;
        end = e;
      }
    }
    const mv = parseInt(p.get("ta_max") || "");
    const maxIntervals =
      Number.isFinite(mv) && mv >= 1 ? mv : DEFAULT_MAX_INTERVALS;
    return { windowRange: { start, end }, maxIntervals };
  });
  const [paramError, setParamError] = useState<string | null>(null);
  const [open, setOpen] = useState({
    series: true,
    channels: true,
    align: true,
    window: true,
    group: true,
    display: false,
  });

  // Window and max intervals apply once they're valid and typing pauses.
  useEffect(() => {
    const t = setTimeout(() => {
      const start = parseFloat(windowRangeStr.start);
      const end = parseFloat(windowRangeStr.end);
      if (isNaN(start) || isNaN(end)) {
        setParamError("Invalid window range.");
        return;
      }
      if (end <= start) {
        setParamError("Window end must be greater than start.");
        return;
      }
      const maxIntervals = parseInt(maxIntervalsStr);
      if (isNaN(maxIntervals) || maxIntervals < 1) {
        setParamError("Invalid maximum number of intervals.");
        return;
      }
      setParamError(null);
      setCommitted({ windowRange: { start, end }, maxIntervals });
    }, 600);
    return () => clearTimeout(t);
  }, [windowRangeStr, maxIntervalsStr]);

  // Display options apply live (no data reload). Opacity 0 hides raw traces,
  // so no separate checkbox is needed.
  const [rawTraceAlpha, setRawTraceAlpha] = useState(0.4);
  const [showStdBand, setShowStdBand] = useState(true);
  const [stdMultipleStr, setStdMultipleStr] = useState("1");
  const stdMultiple = useMemo(() => {
    const v = parseFloat(stdMultipleStr);
    return isNaN(v) || v < 0 ? 1 : v;
  }, [stdMultipleStr]);
  // Redrawing the std lines across every panel is expensive, so debounce: apply
  // the new multiple only ~5s after the user stops changing it.
  const [effectiveStdMultiple, setEffectiveStdMultiple] = useState(1);
  useEffect(() => {
    if (effectiveStdMultiple === stdMultiple) return;
    const t = setTimeout(() => setEffectiveStdMultiple(stdMultiple), 5000);
    return () => clearTimeout(t);
  }, [stdMultiple, effectiveStdMultiple]);
  const stdPending = showStdBand && effectiveStdMultiple !== stdMultiple;
  // How to show groups: overlaid on one plot, or split into side-by-side plots.
  const [groupDisplay, setGroupDisplay] = useState<"overlay" | "split">(() =>
    readHashParams().get("ta_groupdisp") === "split" ? "split" : "overlay",
  );

  // Group by (live). Only offered when the table has categorical columns.
  const categoricalOptions = useCategoricalOptions(nwbUrl, intervalsPath);
  const [groupByVariable, setGroupByVariable] = useState<string>(
    () => readHashParams().get("ta_groupby") || "",
  );

  const [groupByValues, setGroupByValues] = useState<string[] | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!groupByVariable) {
      setGroupByValues(undefined);
      return;
    }
    let canceled = false;
    (async () => {
      const dd = await getHdf5DatasetData(
        nwbUrl,
        intervalsPath + "/" + groupByVariable,
        {},
      );
      if (canceled || !dd) return;
      setGroupByValues(
        [...dd].map((x) => (x as { toString(): string }).toString()),
      );
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, intervalsPath, groupByVariable]);

  const groups: Group[] | undefined = useMemo(() => {
    if (!groupByVariable) return undefined;
    const opt = categoricalOptions?.find(
      (o) => o.variableName === groupByVariable,
    );
    const cats = opt
      ? [...opt.categories].sort()
      : groupByValues
        ? [...new Set(groupByValues)].sort()
        : [];
    return cats.map((c, i) => ({ group: c, color: colorForGroupIndex(i) }));
  }, [groupByVariable, categoricalOptions, groupByValues]);

  // Alignment times for each selected align-to column, so the legend can count
  // the rows that are actually plotted rather than every row of the table.
  const [alignTimesByVariable, setAlignTimesByVariable] = useState<{
    [variable: string]: number[];
  }>({});
  useEffect(() => {
    setAlignTimesByVariable({});
    let canceled = false;
    (async () => {
      for (const variable of alignToVariables) {
        const dd = await getHdf5DatasetData(
          nwbUrl,
          intervalsPath + "/" + variable,
          {},
        );
        if (canceled) return;
        if (!dd) continue;
        const times = Array.from(dd as ArrayLike<number>);
        setAlignTimesByVariable((prev) => ({ ...prev, [variable]: times }));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, intervalsPath, alignToVariables]);

  // Number of traces per group that actually go into the plots: the rows with a
  // finite alignment time, capped at maxIntervals, counted once per selected
  // align-to column. Counting every row instead would claim traces for a group
  // that has none -- aligning to a column that is NaN for a whole condition
  // (e.g. `reward_start_time` on unrewarded trials) plots nothing for it.
  const groupCounts = useMemo(() => {
    if (!groupByValues) return undefined;
    if (alignToVariables.some((v) => !alignTimesByVariable[v]))
      return undefined;
    const counts: { [k: string]: number } = {};
    for (const variable of alignToVariables) {
      for (const i of plottedRowIndexes(
        alignTimesByVariable[variable],
        committed.maxIntervals,
      )) {
        const v = groupByValues[i] ?? "?";
        counts[v] = (counts[v] || 0) + 1;
      }
    }
    return counts;
  }, [
    groupByValues,
    committed.maxIntervals,
    alignToVariables,
    alignTimesByVariable,
  ]);

  // Persist the main selections in the URL hash.
  useEffect(() => {
    const p = readHashParams();
    const setOrDelete = (k: string, val: string, isDefault: boolean) => {
      if (val && !isDefault) p.set(k, val);
      else p.delete(k);
    };
    if (seriesPath) p.set("ta_series", seriesPath);
    else p.delete("ta_series");
    setOrDelete(
      "ta_channels",
      selectedChannels.join(","),
      selectedChannels.length === 1 && selectedChannels[0] === 0,
    );
    setOrDelete(
      "ta_align",
      alignToVariables.join(","),
      alignToVariables.length === 1 && alignToVariables[0] === "start_time",
    );
    setOrDelete(
      "ta_win",
      `${committed.windowRange.start},${committed.windowRange.end}`,
      committed.windowRange.start === DEFAULT_WINDOW.start &&
        committed.windowRange.end === DEFAULT_WINDOW.end,
    );
    setOrDelete(
      "ta_max",
      String(committed.maxIntervals),
      committed.maxIntervals === DEFAULT_MAX_INTERVALS,
    );
    setOrDelete("ta_groupby", groupByVariable, groupByVariable === "");
    setOrDelete(
      "ta_groupdisp",
      groupDisplay,
      !(groupByVariable !== "" && groupDisplay === "split"),
    );
    const newHash = "#" + p.toString();
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", newHash);
    }
  }, [
    seriesPath,
    selectedChannels,
    alignToVariables,
    committed,
    groupByVariable,
    groupDisplay,
  ]);

  // The list shown in the series dropdown (prepend the selected series if it is
  // not among the options), with labels disambiguated by location.
  const seriesRenderPaths = useMemo(
    () =>
      seriesOptions.includes(seriesPath)
        ? seriesOptions
        : [seriesPath, ...seriesOptions],
    [seriesOptions, seriesPath],
  );
  const seriesLabels = useMemo(
    () => buildSeriesLabels(seriesRenderPaths),
    [seriesRenderPaths],
  );

  const settingsWidth = 352;
  const plotAreaWidth = Math.max(width - settingsWidth, 320);
  const gap = 8;
  const numAlign = alignToVariables.length || 1;
  const grouping = !!groups && !!groupByValues && groupByVariable !== "";
  const split = grouping && groupDisplay === "split";
  const panelWidth = Math.max(
    240,
    (plotAreaWidth - 20 - gap * (numAlign - 1)) / numAlign,
  );
  // When splitting into one plot per group, use a fixed cell width and let the
  // channel row scroll horizontally.
  const cellWidth = split ? 340 : panelWidth;
  const panelHeight =
    selectedChannels.length > 1
      ? 320
      : Math.min(Math.max(height - 80, 300), 480);
  const legendActive = !!groups && groupByVariable !== "";
  const seriesLabel = seriesLabels[seriesPath] ?? shortName(seriesPath);
  const summary = [
    client
      ? `${seriesLabel}: ${numChannels} channel${numChannels === 1 ? "" : "s"} at ${client.samplingFrequency.toFixed(1)} Hz`
      : seriesLabel,
    alignToVariables.length > 0 &&
      `aligned to ${alignToVariables.join(" and ")}`,
    `${committed.windowRange.start} to ${committed.windowRange.end} s around each`,
  ]
    .filter(Boolean)
    .join(", ");
  const section = (key: keyof typeof open) => ({
    open: open[key],
    onToggle: (o: boolean) => setOpen((prev) => ({ ...prev, [key]: o })),
  });

  return (
    <ViewPanel
      label="Event-related signal"
      summary={`${summary}.`}
      busy={!client}
      controls={null}
      settings={
        <>
          <AccordionItem
            title="Series"
            summary={seriesLabel}
            {...section("series")}
          >
            <Select
              label="Time series"
              size="sm"
              value={seriesPath}
              onChange={setSeriesPath}
              disabled={seriesOptions.length <= 1}
              options={seriesRenderPaths.map((p) => ({
                value: p,
                label: seriesLabels[p] ?? shortName(p),
              }))}
            />
          </AccordionItem>
          <AccordionItem
            title="Channels"
            summary={`${selectedChannels.length} of ${numChannels}`}
            {...section("channels")}
          >
            <ChannelSelection
              numChannels={numChannels}
              selectedChannels={selectedChannels}
              setSelectedChannels={setSelectedChannels}
            />
          </AccordionItem>
          <AccordionItem
            title="Align to"
            summary={alignToVariables.join(", ") || "None"}
            {...section("align")}
          >
            <AlignToSelectionComponent
              alignToVariables={alignToVariables}
              setAlignToVariables={setAlignToVariables}
              nwbUrl={nwbUrl}
              path={intervalsPath}
            />
          </AccordionItem>
          <AccordionItem
            title="Window"
            summary={`${committed.windowRange.start} to ${committed.windowRange.end} s`}
            {...section("window")}
          >
            <SettingPair>
              <TextInput
                label="From (s)"
                size="sm"
                value={windowRangeStr.start}
                onChange={(start) =>
                  setWindowRangeStr((w) => ({ ...w, start }))
                }
              />
              <TextInput
                label="To (s)"
                size="sm"
                value={windowRangeStr.end}
                onChange={(end) => setWindowRangeStr((w) => ({ ...w, end }))}
              />
            </SettingPair>
            <TextInput
              label="Max intervals"
              size="sm"
              value={maxIntervalsStr}
              onChange={setMaxIntervalsStr}
            />
            {paramError && (
              <div className="event-related-param-error">
                <InlineMessage status="error">{paramError}</InlineMessage>
              </div>
            )}
          </AccordionItem>
          {categoricalOptions && categoricalOptions.length > 0 && (
            <AccordionItem
              title="Group by"
              summary={groupByVariable || "None"}
              {...section("group")}
            >
              <GroupBySelectionComponent
                groupByVariable={groupByVariable}
                setGroupByVariable={setGroupByVariable}
                nwbUrl={nwbUrl}
                path={intervalsPath}
                label="Group intervals by"
              />
              {groupByVariable !== "" && (
                <SegmentedControl
                  label="Groups"
                  size="sm"
                  value={groupDisplay}
                  onChange={(v) => setGroupDisplay(v as "overlay" | "split")}
                  options={[
                    { value: "overlay", label: "Overlay" },
                    { value: "split", label: "Side by side" },
                  ]}
                />
              )}
            </AccordionItem>
          )}
          <AccordionItem title="Display" {...section("display")}>
            <Slider
              label="Single-trial opacity"
              min={0}
              max={1}
              step={0.05}
              showValue
              showField={false}
              value={rawTraceAlpha}
              onChange={setRawTraceAlpha}
            />
            <Checkbox
              label="± standard deviation band"
              checked={showStdBand}
              onChange={setShowStdBand}
            />
            <TextInput
              label="Band width (σ)"
              size="sm"
              value={stdMultipleStr}
              disabled={!showStdBand}
              onChange={setStdMultipleStr}
              helper={stdPending ? "Redrawing shortly…" : undefined}
            />
          </AccordionItem>
        </>
      }
    >
      <div className="event-related-plots">
        {legendActive && (
          <GroupLegend
            label={groupByVariable}
            groups={groups!.map((g) => ({
              ...g,
              count: groupCounts ? (groupCounts[g.group] ?? 0) : undefined,
            }))}
          />
        )}
        {clientError ? (
          <ViewError what="the series" error={clientError} />
        ) : !client ? (
          <LoadingState label="Reading the series" phase="loading" />
        ) : selectedChannels.length === 0 ? (
          <EmptyState title="No channels picked">
            Pick one or more channels in Channels.
          </EmptyState>
        ) : alignToVariables.length === 0 ? (
          <EmptyState title="Nothing to align to">
            Pick one or more columns in Align to.
          </EmptyState>
        ) : (
          selectedChannels.map((ch) => (
            <section key={ch} className="event-related-channel">
              <h3 className="event-related-channel-title">Channel {ch}</h3>
              <div
                className={
                  split
                    ? "event-related-row event-related-row--split"
                    : "event-related-row"
                }
              >
                {alignToVariables.map((alignToVariable) => (
                  <AlignBlock
                    key={alignToVariable}
                    nwbUrl={nwbUrl}
                    intervalsPath={intervalsPath}
                    client={client}
                    alignToVariable={alignToVariable}
                    channel={ch}
                    windowRange={committed.windowRange}
                    maxIntervals={committed.maxIntervals}
                    cellWidth={cellWidth}
                    cellHeight={panelHeight}
                    rawTraceAlpha={rawTraceAlpha}
                    showStdBand={showStdBand}
                    stdMultiple={effectiveStdMultiple}
                    groupByValues={groupByValues}
                    groups={groups}
                    split={split}
                    yAxisLabel={`ch ${ch}`}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </ViewPanel>
  );
};

/** The chart's group colors beside their names; the swatch takes the chart's own color. */
const GroupLegend: FunctionComponent<{
  label: string;
  groups: { group: string; color: string; count?: number }[];
}> = ({ label, groups }) => (
  <ul className="event-related-legend" aria-label={`Groups by ${label}`}>
    {groups.map((g) => (
      <li key={g.group} className="event-related-legend-item">
        <Swatch color={g.color} />
        {g.count !== undefined ? `${g.group} (${g.count})` : g.group}
      </li>
    ))}
  </ul>
);

const Swatch: FunctionComponent<{ color: string }> = ({ color }) => {
  const ref = useCssVars<HTMLSpanElement>({ "--swatch": color });
  return <span ref={ref} className="event-related-swatch" aria-hidden="true" />;
};

/** A box of the plot's size, for the plot or a message in its place. */
const PlotBox: FunctionComponent<{
  width: number;
  height: number;
  className: string;
  children: ReactNode;
}> = ({ width, height, className, children }) => {
  const ref = useCssVars<HTMLDivElement>({
    "--plot-w": width,
    "--plot-h": height,
  });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

type ChannelSelectionProps = {
  numChannels: number;
  selectedChannels: number[];
  setSelectedChannels: (x: number[] | ((prev: number[]) => number[])) => void;
};

const ChannelSelection: FunctionComponent<ChannelSelectionProps> = ({
  numChannels,
  selectedChannels,
  setSelectedChannels,
}) => {
  const channels = useMemo(
    () => Array.from({ length: numChannels }, (_, i) => i),
    [numChannels],
  );
  const all =
    channels.length > 0 && selectedChannels.length === channels.length;
  return (
    <div className="event-related-channels">
      <Checkbox
        label="All channels"
        checked={all ? true : selectedChannels.length > 0 ? "mixed" : false}
        onChange={() =>
          setSelectedChannels(selectedChannels.length > 0 ? [] : channels)
        }
      />
      {channels.map((ch) => (
        <Checkbox
          key={ch}
          label={`Channel ${ch}`}
          checked={selectedChannels.includes(ch)}
          onChange={() =>
            setSelectedChannels((prev) =>
              prev.includes(ch)
                ? prev.filter((x) => x !== ch)
                : [...prev, ch].sort((a, b) => a - b),
            )
          }
        />
      ))}
    </div>
  );
};

type WidgetTrial = {
  times: number[];
  roiValues: number[];
  group: string | number;
};

type AlignBlockProps = {
  nwbUrl: string;
  intervalsPath: string;
  client: TimeseriesClient;
  alignToVariable: string;
  channel: number;
  windowRange: { start: number; end: number };
  maxIntervals: number;
  cellWidth: number;
  cellHeight: number;
  rawTraceAlpha: number;
  showStdBand: boolean;
  stdMultiple: number;
  groupByValues: string[] | undefined;
  groups: Group[] | undefined;
  split: boolean;
  yAxisLabel: string;
};

// Loads the snippets for one (channel, align-to) pair once, then renders either
// a single overlaid plot or one plot per group (split, side by side).
const AlignBlock: FunctionComponent<AlignBlockProps> = ({
  nwbUrl,
  intervalsPath,
  client,
  alignToVariable,
  channel,
  windowRange,
  maxIntervals,
  cellWidth,
  cellHeight,
  rawTraceAlpha,
  showStdBand,
  stdMultiple,
  groupByValues,
  groups,
  split,
  yAxisLabel,
}) => {
  const [rawTrials, setRawTrials] = useState<AlignedTrial[] | null>(null);
  const [numAlignTimes, setNumAlignTimes] = useState<number | null>(null);
  // Rows whose alignment time is NaN, so they are not plotted at all.
  const [numMissingAlignTimes, setNumMissingAlignTimes] = useState(0);
  const [progress, setProgress] = useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const canceler = { canceled: false };
    setRawTrials(null);
    setError(null);
    setProgress({ loaded: 0, total: 0 });
    (async () => {
      try {
        const rawTimes = await getHdf5DatasetData(
          nwbUrl,
          intervalsPath + "/" + alignToVariable,
          {},
        );
        if (!rawTimes)
          throw new Error(`Unable to load ${intervalsPath}/${alignToVariable}`);
        const alignTimes = Array.from(rawTimes as ArrayLike<number>);
        if (canceled) return;
        setNumAlignTimes(alignTimes.length);
        setNumMissingAlignTimes(alignTimes.filter((t) => !isFinite(t)).length);
        const loaded = await loadEventRelatedSnippets(
          client,
          alignTimes,
          channel,
          windowRange,
          {
            maxIntervals,
            canceler,
            onProgress: (loadedCount, total) => {
              if (!canceled) setProgress({ loaded: loadedCount, total });
            },
          },
        );
        if (canceled) return;
        setRawTrials(loaded);
      } catch (err) {
        if (!canceled)
          setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      canceled = true;
      canceler.canceled = true;
    };
  }, [
    nwbUrl,
    intervalsPath,
    client,
    alignToVariable,
    channel,
    windowRange,
    maxIntervals,
  ]);

  // Only group once both the group definitions and the per-row values are
  // ready; otherwise fall back to a single group (avoids a blank flash while
  // the group-by column loads).
  const grouping = !!groups && !!groupByValues;

  // Assign a group to each trial by its row index (live; no snippet reload).
  const allTrials: WidgetTrial[] | null = useMemo(() => {
    if (!rawTrials) return null;
    return rawTrials.map((tr) => ({
      times: tr.times,
      roiValues: tr.roiValues,
      group: grouping ? (groupByValues![tr.index] ?? "?") : 0,
    }));
  }, [rawTrials, grouping, groupByValues]);

  // Actual number of intervals plotted (rows with a valid alignment time,
  // capped at maxIntervals) out of the table's total rows, naming the missing
  // alignment times when there are any: a column that is NaN for a whole
  // condition (e.g. `reward_start_time` on unrewarded trials) is why that
  // condition can come out empty.
  const countLabel = allTrials
    ? ` (${allTrials.length}${
        numAlignTimes !== null && allTrials.length < numAlignTimes
          ? ` of ${numAlignTimes}`
          : ""
      } intervals${
        numMissingAlignTimes > 0
          ? `; ${numMissingAlignTimes} without ${alignToVariable}`
          : ""
      })`
    : "";

  // Memoize the per-cell trial arrays so their references stay stable across
  // re-renders (e.g. while the user edits an unrelated live control). Without
  // this, new trials/groups arrays each render would invalidate the widget's
  // interpolation memos and re-run the expensive mean/std computation.
  const cells = useMemo(() => {
    if (!allTrials) return null;
    if (split && grouping) {
      return groups!.map((g) => {
        const trials = allTrials.filter((t) => t.group === g.group);
        return {
          key: String(g.group),
          title: `${alignToVariable} · ${g.group} (${trials.length})`,
          trials,
          widgetGroups: [g] as Group[],
          // Draw the mean/band in the group's color so a group looks the same
          // in split as in overlay.
          perGroupStats: true,
        };
      });
    }
    return [
      {
        key: "_all",
        title: alignToVariable + countLabel,
        trials: allTrials,
        widgetGroups: (grouping
          ? groups!
          : [{ group: 0, color: seriesColor }]) as (
          | Group
          | { group: number; color: string }
        )[],
        perGroupStats: grouping,
      },
    ];
  }, [allTrials, split, grouping, groups, alignToVariable, countLabel]);

  const statusBox = (text: ReactNode) => (
    <PlotBox
      width={cellWidth}
      height={cellHeight}
      className="event-related-status"
    >
      {text}
    </PlotBox>
  );

  if (error)
    return statusBox(<ViewError what="the trial snippets" error={error} />);
  if (!allTrials || !cells)
    return statusBox(
      <LoadingState
        label="Reading the trial snippets"
        phase="loading"
        progress={
          progress.total
            ? { value: progress.loaded, max: progress.total, unit: "intervals" }
            : undefined
        }
      />,
    );
  if (allTrials.length === 0) return statusBox("No intervals to show.");

  return (
    <div className="event-related-cells">
      {cells.map((cell) => (
        <TrialPlot
          key={cell.key}
          width={cellWidth}
          height={cellHeight}
          title={cell.title}
          trials={cell.trials}
          groups={cell.widgetGroups}
          perGroupStats={cell.perGroupStats}
          windowRange={windowRange}
          alignToVariable={alignToVariable}
          numMissingAlignTimes={numMissingAlignTimes}
          rawTraceAlpha={rawTraceAlpha}
          showStdBand={showStdBand}
          stdMultiple={stdMultiple}
          yAxisLabel={yAxisLabel}
        />
      ))}
    </div>
  );
};

type TrialPlotProps = {
  width: number;
  height: number;
  title: string;
  trials: WidgetTrial[];
  groups: (Group | { group: number; color: string })[];
  perGroupStats: boolean;
  windowRange: { start: number; end: number };
  alignToVariable: string;
  numMissingAlignTimes: number;
  rawTraceAlpha: number;
  showStdBand: boolean;
  stdMultiple: number;
  yAxisLabel: string;
};

const TrialPlot: FunctionComponent<TrialPlotProps> = ({
  width,
  height,
  title,
  trials,
  groups,
  perGroupStats,
  windowRange,
  alignToVariable,
  numMissingAlignTimes,
  rawTraceAlpha,
  showStdBand,
  stdMultiple,
  yAxisLabel,
}) => {
  const titleHeight = 22;
  const widgetHeight = height - titleHeight;
  return (
    <PlotBox width={width} height={height} className="event-related-plot">
      <p className="event-related-plot-title" title={title}>
        {title}
      </p>
      <div>
        {trials.length === 0 ? (
          <p className="event-related-status-text">
            No intervals
            {numMissingAlignTimes > 0 ? ` (no ${alignToVariable})` : ""}.
          </p>
        ) : (
          <TrialAlignedSeriesWidget
            width={width}
            height={widgetHeight}
            trials={trials}
            groups={groups}
            windowRange={windowRange}
            alignmentVariableName={alignToVariable}
            showRawTraces={rawTraceAlpha > 0}
            rawTraceAlpha={rawTraceAlpha}
            showStdBand={showStdBand}
            stdMultiple={stdMultiple}
            yAxisLabel={yAxisLabel}
            perGroupStats={perGroupStats}
          />
        )}
      </div>
    </PlotBox>
  );
};

export default EventRelatedSignalView;
