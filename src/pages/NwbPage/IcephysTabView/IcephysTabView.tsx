import {
  AccordionItem,
  Button,
  Checkbox,
  type Column,
  DataTable,
  EmptyState,
  InlineCode,
  InlineMessage,
  LoadingState,
  ProgressBar,
  Select,
  type SelectOption,
  SettingPair,
  TextInput,
  useLoadingPhase,
  ViewPanel,
} from "@ui";
import { useCssVars } from "@components/useCssVars";
import {
  FunctionComponent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toWithCurrentHash } from "../urlHash";
import { getHdf5Group } from "../hdf5Interface";
import { useElementSize } from "../useElementSize";
import ConditionSelector from "./ConditionSelector";
import FacetLegend from "./FacetLegend";
import { facetColors } from "./sweepGroups";
import FamilyFacetGrid from "./FamilyFacetGrid";
import FamilyOverlayPlot from "./FamilyOverlayPlot";
import { pickDisplayUnit } from "./displayUnit";
import FamilySeparatePanels from "./FamilySeparatePanels";
import ProtocolSelector from "./ProtocolSelector";
import RepetitionSelector from "./RepetitionSelector";
import TemporalDistribution from "./TemporalDistribution";
import { ALL_ROW, ResolvedSweep, ScopeSelection } from "./useChain";
import { IcephysRow, useIcephysTable } from "./useIcephysTable";
import { useSweepData } from "./useSweepData";
import { useSweepTimes } from "./useSweepTimes";
import {
  axisLabel,
  axisOptions,
  axisParam,
  COLOR_BY_VALUES,
  fileSummary,
  numParam,
  PANELS_BY_VALUES,
  panelKey,
  panelLabel,
  sampleIndices,
} from "./viewState";
import { parseXWindow } from "./xWindow";
import "./IcephysTabView.css";

interface IcephysTabViewProps {
  nwbUrl: string;
  width: number;
  height: number;
  isExpanded: boolean;
}

// Large families are sampled: this many evenly spaced sweeps first, then Plot more or Plot all.
const SAMPLE_SIZE = 30;
// Above this many sweeps, Plot all says it may be slow.
const PLOT_ALL_WARN = 60;
// A custom column is a Color or Panels axis only with 2 to this many values in scope.
const MAX_CUSTOM_AXIS_VALUES = 8;
const TIMELINE_H = 84;

// A scope row value is a real selection (not the "All" sentinel and not unset).
const isSpecificRow = (v: number | undefined): v is number =>
  v !== undefined && v !== ALL_ROW;

const IcephysTabView: FunctionComponent<IcephysTabViewProps> = ({
  nwbUrl,
  width,
  height,
  isExpanded,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [hasIcephys, setHasIcephys] = useState<boolean | null>(null);
  // Selection + encoding are seeded from the URL (a refresh / shared link), then
  // kept in sync below; see the URL-persistence note above.
  const [scope, setScope] = useState<ScopeSelection>(() => ({
    protoRow: numParam(searchParams, "icephysProtocol"),
    condRow: numParam(searchParams, "icephysCondition"),
    repRow: numParam(searchParams, "icephysRepetition"),
  }));
  const [sampleLimit, setSampleLimit] = useState(SAMPLE_SIZE);
  // Axis types include (string & {}) so a custom "col:<name>" column can be an axis.
  const [colorBy, setColorBy] = useState<
    | "auto"
    | "protocol"
    | "condition"
    | "repetition"
    | "electrode"
    | "cell"
    | (string & {})
  >(() => axisParam(searchParams, "icephysColorBy", COLOR_BY_VALUES, "auto"));
  const [panelsBy, setPanelsBy] = useState<
    | "none"
    | "protocol"
    | "condition"
    | "repetition"
    | "electrode"
    | "cell"
    | (string & {})
  >(() => axisParam(searchParams, "icephysPanelsBy", PANELS_BY_VALUES, "none"));
  // Optional second panel axis -> 2-D facet grid (rows = panelsBy, cols = this).
  const [panelsBy2, setPanelsBy2] = useState<
    | "none"
    | "protocol"
    | "condition"
    | "repetition"
    | "electrode"
    | "cell"
    | (string & {})
  >(() => axisParam(searchParams, "icephysAndBy", PANELS_BY_VALUES, "none"));
  // Within-sweep x-window crop (ms), shared across all panels. Empty = full range.
  const [xWindowStr, setXWindowStr] = useState<{ start: string; end: string }>(
    () => ({
      start: searchParams.get("icephysWindowStart") ?? "",
      end: searchParams.get("icephysWindowEnd") ?? "",
    }),
  );
  // Opt in: sharing a y range per unit is a pass over the loaded sweeps,
  // so it runs only when asked and once the sample has loaded.
  const [lockY, setLockY] = useState(
    () => searchParams.get("icephysLockY") === "1",
  );

  useEffect(() => {
    if (!isExpanded) return;
    let cancelled = false;
    (async () => {
      const irt = await getHdf5Group(
        nwbUrl,
        "/general/intracellular_ephys/intracellular_recordings",
      );
      if (cancelled) return;
      setHasIcephys(irt !== undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [nwbUrl, isExpanded]);

  // A new file resets the view; the first run is skipped so a shared link's
  // settings survive the first load.
  const persistedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (persistedUrlRef.current === null) {
      persistedUrlRef.current = nwbUrl;
      return;
    }
    if (persistedUrlRef.current === nwbUrl) return;
    persistedUrlRef.current = nwbUrl;
    setScope({});
    setColorBy("auto");
    setPanelsBy("none");
    setPanelsBy2("none");
    setXWindowStr({ start: "", end: "" });
    setLockY(false);
  }, [nwbUrl]);

  // Mirrors the view into the address (replace, defaults left out). The equality
  // guard stops a navigate loop.
  useEffect(() => {
    const p = new URLSearchParams(searchParams);
    const put = (key: string, value: string | number | undefined) => {
      if (value === undefined || value === "") p.delete(key);
      else p.set(key, String(value));
    };
    put("icephysProtocol", scope.protoRow);
    put("icephysCondition", scope.condRow);
    put("icephysRepetition", scope.repRow);
    put("icephysColorBy", colorBy === "auto" ? undefined : colorBy);
    put("icephysPanelsBy", panelsBy === "none" ? undefined : panelsBy);
    put("icephysAndBy", panelsBy2 === "none" ? undefined : panelsBy2);
    put("icephysWindowStart", xWindowStr.start || undefined);
    put("icephysWindowEnd", xWindowStr.end || undefined);
    put("icephysLockY", lockY ? "1" : undefined);
    if (p.toString() !== searchParams.toString()) {
      navigate(toWithCurrentHash(p), { replace: true });
    }
  }, [
    scope.protoRow,
    scope.condRow,
    scope.repRow,
    colorBy,
    panelsBy,
    panelsBy2,
    xWindowStr.start,
    xWindowStr.end,
    lockY,
    searchParams,
    navigate,
  ]);

  // Protocol anchors; Condition and Repetition narrow it. Changing Condition
  // resets Repetition, which it contains.
  const setProtoRow = (v: number | undefined) =>
    setScope((s) => ({ ...s, protoRow: v }));
  const setCondRow = (v: number | undefined) =>
    setScope((s) => ({ protoRow: s.protoRow, condRow: v }));
  const setRepRow = (v: number | undefined) =>
    setScope((s) => ({ protoRow: s.protoRow, condRow: s.condRow, repRow: v }));

  // The file is resolved once into a tidy table and scope applied in memory.
  // Protocol matches by name, Condition and Repetition by row.
  const table = useIcephysTable(nwbUrl);
  const selectedProtocolName = isSpecificRow(scope.protoRow)
    ? table.rows.find((r) => r.seqRow === scope.protoRow)?.protocolLabel
    : undefined;
  const inScopeRows = useMemo(() => {
    return table.rows.filter((r) => {
      if (isSpecificRow(scope.condRow) && r.condRow !== scope.condRow)
        return false;
      if (isSpecificRow(scope.repRow) && r.repRow !== scope.repRow)
        return false;
      if (
        isSpecificRow(scope.protoRow) &&
        r.protocolLabel !== selectedProtocolName
      )
        return false;
      return true;
    });
  }, [
    table.rows,
    scope.condRow,
    scope.repRow,
    scope.protoRow,
    selectedProtocolName,
  ]);

  // Any explicit pick opens the plot; a large family is sampled, not blocked.
  const hasAnySelection =
    scope.condRow !== undefined ||
    scope.repRow !== undefined ||
    scope.protoRow !== undefined;

  // Files with no tier to pick have nothing to choose, so they plot at once.
  const hasNarrowableTier =
    table.chainDepth.includes("experimental_conditions") ||
    table.chainDepth.includes("repetitions") ||
    table.chainDepth.includes("sequential_recordings");
  const shouldRender =
    hasAnySelection || (!hasNarrowableTier && inScopeRows.length > 0);

  // Default ("auto") color grouping: by Protocol unless a specific Protocol is
  // pinned (then by sweep). The Color-by control can override this.
  const autoColor: "protocol" | "sweep" =
    scope.protoRow === ALL_ROW || scope.protoRow === undefined
      ? "protocol"
      : "sweep";

  // Metadata only, so the timeline covers every sweep in scope, not just the sample.
  const sweepTimes = useSweepTimes(nwbUrl, shouldRender ? inScopeRows : []);

  // The whole session, drawn in gray behind the selection.
  const showTimeline =
    shouldRender && !table.loading && table.error !== "UNSUPPORTED_ASSET";
  const contextTimes = useSweepTimes(nwbUrl, showTimeline ? table.rows : []);

  // An axis can color or split only if it varies within the scope.
  const distinctConds = new Set(
    inScopeRows.map((s) => s.condRow).filter((x) => x !== undefined),
  ).size;
  const distinctReps = new Set(
    inScopeRows.map((s) => s.repRow).filter((x) => x !== undefined),
  ).size;
  const distinctProtocols = new Set(
    inScopeRows.map((s) => s.protocolLabel ?? `seq ${s.seqRow}`),
  ).size;
  const distinctElectrodes = new Set(
    inScopeRows.map((s) => s.electrode).filter((x) => x !== undefined),
  ).size;
  const distinctCells = new Set(
    inScopeRows.map((s) => s.cell).filter((x) => x !== undefined),
  ).size;
  const condVaries = distinctConds >= 2;
  const repVaries = distinctReps >= 2;
  const protocolVaries = distinctProtocols >= 2;
  const electrodeVaries = distinctElectrodes >= 2;
  const cellVaries = distinctCells >= 2;

  // Custom columns as axes, keyed "col:<name>": 2 values or more, but few
  // enough not to scatter the grid into confetti.
  const customAxisOptions = useMemo(() => {
    return table.columns
      .map((name) => {
        const distinct = new Set(
          inScopeRows
            .map((r) => r.custom[name])
            .filter((v) => v !== undefined && v !== ""),
        ).size;
        return { name, axis: `col:${name}`, distinct };
      })
      .filter((o) => o.distinct >= 2 && o.distinct <= MAX_CUSTOM_AXIS_VALUES);
  }, [table.columns, inScopeRows]);
  const customAxisSet = useMemo(
    () => new Set(customAxisOptions.map((o) => o.axis)),
    [customAxisOptions],
  );

  // File-wide data summary for the sidebar (always-on orientation), from the
  // whole-session sweep set.
  const fileSweeps = table.rows;

  // Cross-filter: an option is on only if it occurs with the other axes' picks,
  // so an empty combination can't be built.
  const condSel =
    scope.condRow !== undefined && scope.condRow !== ALL_ROW
      ? scope.condRow
      : undefined;
  const repSel =
    scope.repRow !== undefined && scope.repRow !== ALL_ROW
      ? scope.repRow
      : undefined;
  const protoNameSel =
    scope.protoRow !== undefined && scope.protoRow !== ALL_ROW
      ? fileSweeps.find((s) => s.seqRow === scope.protoRow)?.protocolLabel
      : undefined;
  const enabledConds = new Set<number>();
  const enabledReps = new Set<number>();
  const enabledProtoNames = new Set<string>();
  for (const s of fileSweeps) {
    const okC = condSel === undefined || s.condRow === condSel;
    const okR = repSel === undefined || s.repRow === repSel;
    const okP = protoNameSel === undefined || s.protocolLabel === protoNameSel;
    if (okR && okP && s.condRow !== undefined) enabledConds.add(s.condRow);
    if (okC && okP && s.repRow !== undefined) enabledReps.add(s.repRow);
    if (okC && okR && s.protocolLabel) enabledProtoNames.add(s.protocolLabel);
  }
  const haveProvenance = fileSweeps.length > 0;

  // Columns that vary across the selection become table columns; constant ones
  // collapse to one line. The cap is only a backstop for huge flat files.
  const SELECTION_ROW_CAP = 500;
  const selSweeps = inScopeRows;
  const candidateCols: {
    header: string;
    get: (s: IcephysRow) => string | undefined;
  }[] = [
    { header: "protocol", get: (s) => s.protocolLabel },
    {
      header: "condition",
      get: (s) => (s.condRow !== undefined ? String(s.condRow) : undefined),
    },
    {
      header: "repetition",
      get: (s) => (s.repRow !== undefined ? String(s.repRow) : undefined),
    },
    { header: "electrode", get: (s) => s.electrode },
    ...table.columns.map((name) => ({
      header: name,
      get: (s: IcephysRow) => s.custom[name],
    })),
  ];
  const dfVaryingCols: typeof candidateCols = [];
  const dfShared: { header: string; value: string }[] = [];
  for (const col of candidateCols) {
    const vals = new Set<string>();
    for (const s of selSweeps) {
      const v = col.get(s);
      if (v !== undefined && v !== "") vals.add(v);
    }
    if (vals.size === 0) continue;
    if (vals.size === 1)
      dfShared.push({ header: col.header, value: [...vals][0] });
    else dfVaryingCols.push(col);
  }
  const dfRows = selSweeps.slice(0, SELECTION_ROW_CAP);

  // Resolve the two encoding channels, falling back when the chosen axis does
  // not vary (guards the render against a stale pick).
  const resolvedColor: string = colorBy.startsWith("col:")
    ? customAxisSet.has(colorBy)
      ? colorBy
      : autoColor
    : colorBy === "protocol" && protocolVaries
      ? "protocol"
      : colorBy === "condition" && condVaries
        ? "condition"
        : colorBy === "repetition" && repVaries
          ? "repetition"
          : colorBy === "electrode" && electrodeVaries
            ? "electrode"
            : colorBy === "cell" && cellVaries
              ? "cell"
              : autoColor;
  const resolvedPanels: string = panelsBy.startsWith("col:")
    ? customAxisSet.has(panelsBy)
      ? panelsBy
      : "none"
    : panelsBy === "protocol" && protocolVaries
      ? "protocol"
      : panelsBy === "condition" && condVaries
        ? "condition"
        : panelsBy === "repetition" && repVaries
          ? "repetition"
          : panelsBy === "electrode" && electrodeVaries
            ? "electrode"
            : panelsBy === "cell" && cellVaries
              ? "cell"
              : "none";
  // Optional second panel axis (the columns of a 2-D facet grid). Only when the
  // first panel axis is set, the second varies, and it differs from the first.
  const resolvedPanels2: string =
    resolvedPanels === "none"
      ? "none"
      : panelsBy2.startsWith("col:")
        ? customAxisSet.has(panelsBy2) && resolvedPanels !== panelsBy2
          ? panelsBy2
          : "none"
        : panelsBy2 === "protocol" &&
            protocolVaries &&
            resolvedPanels !== "protocol"
          ? "protocol"
          : panelsBy2 === "condition" &&
              condVaries &&
              resolvedPanels !== "condition"
            ? "condition"
            : panelsBy2 === "repetition" &&
                repVaries &&
                resolvedPanels !== "repetition"
              ? "repetition"
              : panelsBy2 === "electrode" &&
                  electrodeVaries &&
                  resolvedPanels !== "electrode"
                ? "electrode"
                : panelsBy2 === "cell" &&
                    cellVaries &&
                    resolvedPanels !== "cell"
                  ? "cell"
                  : "none";
  // Inside a panel, the panel axis (or axes) is constant, so coloring by it would
  // be flat; fall back to a per-sweep gradient.
  const innerColor: string =
    resolvedColor === resolvedPanels || resolvedColor === resolvedPanels2
      ? "sweep"
      : resolvedColor;

  const { range: xRangeMs, error: windowError } = parseXWindow(
    xWindowStr.start,
    xWindowStr.end,
  );

  // One sample budget: overlay strides over the scope; panels share it evenly,
  // at least one sweep each. The timeline always shows every sweep.
  let sweepsToLoad: ResolvedSweep[] = [];
  let perPanelCap = 0;
  if (shouldRender) {
    if (resolvedPanels === "none") {
      sweepsToLoad = sampleIndices(inScopeRows.length, sampleLimit).map(
        (i) => inScopeRows[i],
      );
    } else {
      const groups = new Map<string, number[]>();
      inScopeRows.forEach((sw, i) => {
        // Sample per facet cell: one axis (1-D) or the (row, col) pair (2-D).
        const key =
          resolvedPanels2 === "none"
            ? panelKey(sw, resolvedPanels)
            : panelKey(sw, resolvedPanels) +
              "|" +
              panelKey(sw, resolvedPanels2);
        const arr = groups.get(key);
        if (arr) arr.push(i);
        else groups.set(key, [i]);
      });
      perPanelCap = Math.max(1, Math.ceil(sampleLimit / groups.size));
      const keep = new Set<number>();
      for (const idxs of groups.values()) {
        for (const j of sampleIndices(idxs.length, perPanelCap))
          keep.add(idxs[j]);
      }
      sweepsToLoad = inScopeRows.filter((_, i) => keep.has(i));
    }
  }
  const isSampled = shouldRender && sweepsToLoad.length < inScopeRows.length;
  const sweepData = useSweepData(nwbUrl, sweepsToLoad);

  // Shared y range per display unit across panels, once the sample has loaded.
  const yRangeByUnit = useMemo<
    Record<string, [number, number]> | undefined
  >(() => {
    if (resolvedPanels === "none" || !lockY || sweepData.loading)
      return undefined;
    const acc: Record<string, [number, number]> = {};
    const track = (unit: string, ys: Float32Array, scale: number) => {
      let lo = acc[unit]?.[0] ?? Infinity;
      let hi = acc[unit]?.[1] ?? -Infinity;
      for (let i = 0; i < ys.length; i++) {
        const v = ys[i] * scale;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (lo <= hi) acc[unit] = [lo, hi];
    };
    for (const sw of sweepData.loaded) {
      const ru = pickDisplayUnit(sw.response.unit);
      track(ru.label, sw.response.y, ru.scale);
      if (sw.stimulus) {
        const su = pickDisplayUnit(sw.stimulus.unit);
        track(su.label, sw.stimulus.y, su.scale);
      }
    }
    // Pad 5% so traces aren't flush against the panel edge.
    for (const k of Object.keys(acc)) {
      const [lo, hi] = acc[k];
      const pad = (hi - lo) * 0.05 || 1;
      acc[k] = [lo - pad, hi + pad];
    }
    return Object.keys(acc).length ? acc : undefined;
  }, [sweepData.loaded, sweepData.loading, resolvedPanels, lockY]);

  // Legend for the panels' colors: the inner color axis when categorical,
  // else the panel axis, colored the way the panels color them.
  const legendAxis = innerColor !== "sweep" ? innerColor : resolvedPanels;
  const facetLegend =
    resolvedPanels !== "none" &&
    legendAxis !== "none" &&
    sweepData.loaded.length > 0
      ? facetColors(sweepData.loaded, legendAxis)
      : null;

  // Sweeps per panel (or per row and column) over the whole scope, not the sample.
  const facetCounts = useMemo(() => {
    if (resolvedPanels === "none" || inScopeRows.length === 0) return null;
    const rowOrder: string[] = [];
    const rowLabel = new Map<string, string>();
    const colOrder: string[] = [];
    const colLabel = new Map<string, string>();
    const count = new Map<string, number>(); // keyed by JSON.stringify([rk, ck])
    const twoD = resolvedPanels2 !== "none";
    for (const sw of inScopeRows) {
      const rk = panelKey(sw, resolvedPanels);
      if (!rowLabel.has(rk)) {
        rowLabel.set(rk, panelLabel(sw, resolvedPanels));
        rowOrder.push(rk);
      }
      let ck = "";
      if (twoD) {
        ck = panelKey(sw, resolvedPanels2);
        if (!colLabel.has(ck)) {
          colLabel.set(ck, panelLabel(sw, resolvedPanels2));
          colOrder.push(ck);
        }
      }
      const key = JSON.stringify([rk, ck]);
      count.set(key, (count.get(key) ?? 0) + 1);
    }
    return { rowOrder, rowLabel, colOrder, colLabel, count, twoD };
  }, [inScopeRows, resolvedPanels, resolvedPanels2]);

  // The timeline takes the visible categorical encoding: the Color axis,
  // else the Panels axis when Color resolves to a per-sweep gradient.
  const timelineColorRaw =
    resolvedColor === "sweep" && resolvedPanels !== "none"
      ? resolvedPanels
      : resolvedColor;
  // The timeline has no cell field, so a cell color shows there by electrode.
  const timelineColor:
    | "protocol"
    | "sweep"
    | "condition"
    | "repetition"
    | "electrode"
    | (string & {}) =
    timelineColorRaw === "cell" ? "electrode" : timelineColorRaw;

  // Reset picks that no longer vary, but only once loaded, so a shared link's
  // axis isn't reset before its data arrives.
  useEffect(() => {
    if (table.loading) return;
    if (colorBy === "protocol" && !protocolVaries) setColorBy("auto");
    if (colorBy === "condition" && !condVaries) setColorBy("auto");
    if (colorBy === "repetition" && !repVaries) setColorBy("auto");
    if (colorBy === "electrode" && !electrodeVaries) setColorBy("auto");
    if (colorBy === "cell" && !cellVaries) setColorBy("auto");
    if (colorBy.startsWith("col:") && !customAxisSet.has(colorBy))
      setColorBy("auto");
  }, [
    colorBy,
    protocolVaries,
    condVaries,
    repVaries,
    electrodeVaries,
    cellVaries,
    customAxisSet,
    table.loading,
  ]);
  useEffect(() => {
    if (table.loading) return;
    const ok =
      (panelsBy === "protocol" && protocolVaries) ||
      (panelsBy === "condition" && condVaries) ||
      (panelsBy === "repetition" && repVaries) ||
      (panelsBy === "electrode" && electrodeVaries) ||
      (panelsBy === "cell" && cellVaries) ||
      (panelsBy.startsWith("col:") && customAxisSet.has(panelsBy));
    if (panelsBy !== "none" && !ok) setPanelsBy("none");
  }, [
    panelsBy,
    protocolVaries,
    condVaries,
    repVaries,
    electrodeVaries,
    cellVaries,
    customAxisSet,
    table.loading,
  ]);
  // Reset the second panel axis when it becomes invalid (no first axis, same as
  // the first, or no longer varies).
  useEffect(() => {
    if (table.loading) return;
    if (panelsBy2 === "none") return;
    const varies =
      (panelsBy2 === "protocol" && protocolVaries) ||
      (panelsBy2 === "condition" && condVaries) ||
      (panelsBy2 === "repetition" && repVaries) ||
      (panelsBy2 === "electrode" && electrodeVaries) ||
      (panelsBy2 === "cell" && cellVaries) ||
      (panelsBy2.startsWith("col:") && customAxisSet.has(panelsBy2));
    if (panelsBy === "none" || panelsBy2 === panelsBy || !varies)
      setPanelsBy2("none");
  }, [
    panelsBy,
    panelsBy2,
    protocolVaries,
    condVaries,
    repVaries,
    electrodeVaries,
    cellVaries,
    customAxisSet,
    table.loading,
  ]);

  // A new scope starts from the small sample again.
  useEffect(() => {
    setSampleLimit(SAMPLE_SIZE);
  }, [scope.condRow, scope.repRow, scope.protoRow]);

  const frame = useCssVars<HTMLDivElement>({
    "--icephys-w": width,
    "--icephys-h": height,
  });
  const lockYHelpId = useId();
  const [open, setOpen] = useState({
    scope: true,
    axes: true,
    sweeps: true,
    colors: true,
    counts: false,
  });
  const section = (key: keyof typeof open) => ({
    open: open[key],
    onToggle: (o: boolean) => setOpen((prev) => ({ ...prev, [key]: o })),
  });
  const checkingPhase = useLoadingPhase(isExpanded && hasIcephys === null);
  const tablePhase = useLoadingPhase(hasIcephys === true && table.loading);

  if (!isExpanded) return null;

  if (hasIcephys === null) {
    return (
      <div ref={frame} className="icephys icephys--state">
        <LoadingState
          label="Looking for intracellular recordings"
          phase={checkingPhase}
        />
      </div>
    );
  }
  if (!hasIcephys) {
    return (
      <div ref={frame} className="icephys icephys--state">
        <EmptyState title="No intracellular recordings in this file">
          There is no{" "}
          <InlineCode>
            /general/intracellular_ephys/intracellular_recordings
          </InlineCode>{" "}
          table, so there are no sweeps to plot.
        </EmptyState>
      </div>
    );
  }

  const hasCond = table.chainDepth.includes("experimental_conditions");
  const hasRep = table.chainDepth.includes("repetitions");
  const hasSeq = table.chainDepth.includes("sequential_recordings");
  const unsupported = table.error === "UNSUPPORTED_ASSET";
  const ready = !table.loading && !unsupported;
  const plotting = ready && shouldRender && inScopeRows.length > 0;

  const varies = {
    protocol: protocolVaries,
    condition: condVaries,
    repetition: repVaries,
    electrode: electrodeVaries,
    cell: cellVaries,
  };
  const windowSet = xWindowStr.start !== "" || xWindowStr.end !== "";
  const protocolName = isSpecificRow(scope.protoRow)
    ? selectedProtocolName
    : scope.protoRow === ALL_ROW
      ? "All protocols"
      : undefined;
  const scopeSummary =
    [
      protocolName,
      isSpecificRow(scope.condRow) && `condition ${scope.condRow}`,
      isSpecificRow(scope.repRow) && `repetition ${scope.repRow}`,
    ]
      .filter(Boolean)
      .join(" · ") || (shouldRender ? "Whole file" : "Not chosen");
  const axesSummary = [
    xRangeMs ? `${xRangeMs[0]} to ${xRangeMs[1]} ms` : "Whole sweep",
    resolvedPanels !== "none" && lockY && "y locked",
  ]
    .filter(Boolean)
    .join(" · ");
  const tables = `${table.chainDepth.length} of 5 icephys tables: ${table.chainDepth.map((t) => t.replace("_recordings", "")).join(", ")}`;
  const summary = [fileSummary(fileSweeps), table.chainDepth.length && tables]
    .filter(Boolean)
    .join(" · ");
  const plural = (n: number, word: string) =>
    `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
  // The first pick that opens the plot: every protocol, else every condition or repetition.
  const pickAll = hasSeq
    ? () => setProtoRow(ALL_ROW)
    : hasCond
      ? () => setCondRow(ALL_ROW)
      : hasRep
        ? () => setRepRow(ALL_ROW)
        : undefined;

  const sweepColumns: Column<IcephysRow>[] = [
    { key: "sweep", label: "Sweep", type: "number", value: (s) => s.irtRow },
    ...dfVaryingCols.map((c) => ({
      key: c.header,
      label: c.header,
      value: (s: IcephysRow) => c.get(s) ?? "",
    })),
  ];
  const countColumns: Column<string>[] = facetCounts
    ? [
        {
          key: "panel",
          label: axisLabel(resolvedPanels),
          value: (rk) => facetCounts.rowLabel.get(rk),
        },
        ...(facetCounts.twoD
          ? facetCounts.colOrder.map((ck) => ({
              ck,
              label: facetCounts.colLabel.get(ck) ?? ck,
            }))
          : [{ ck: "", label: "Sweeps" }]
        ).map(({ ck, label }) => ({
          key: `n:${ck}`,
          label,
          type: "number" as const,
          value: (rk: string) =>
            facetCounts.count.get(JSON.stringify([rk, ck])) ?? 0,
        })),
      ]
    : [];

  const controls = plotting ? (
    <>
      <AxisSelect
        label="Color by"
        value={colorBy}
        onChange={setColorBy}
        options={axisOptions(
          { value: "auto", label: "Auto" },
          varies,
          customAxisOptions,
        )}
      />
      <AxisSelect
        label="Panels by"
        value={panelsBy}
        onChange={setPanelsBy}
        options={axisOptions(
          { value: "none", label: "None" },
          varies,
          customAxisOptions,
        )}
      />
      {panelsBy !== "none" && (
        <AxisSelect
          label="And by"
          value={panelsBy2}
          onChange={setPanelsBy2}
          options={axisOptions(
            { value: "none", label: "None" },
            varies,
            customAxisOptions,
            panelsBy,
          )}
        />
      )}
      {isSampled && (
        <div className="icephys-sample">
          <p className="icephys-sample-text">
            {`Showing ${sweepsToLoad.length} of ${plural(inScopeRows.length, "sweep")}, ${
              resolvedPanels === "none"
                ? "evenly spaced"
                : `up to ${perPanelCap} per panel`
            }`}
          </p>
          <Button
            size="sm"
            onClick={() =>
              setSampleLimit((l) => Math.min(inScopeRows.length, l * 2))
            }
          >
            Plot more
          </Button>
          <Button size="sm" onClick={() => setSampleLimit(inScopeRows.length)}>
            {inScopeRows.length > PLOT_ALL_WARN
              ? `Plot all ${inScopeRows.length} (slow)`
              : "Plot all"}
          </Button>
        </div>
      )}
    </>
  ) : null;

  const settings = (
    <>
      <AccordionItem title="Scope" summary={scopeSummary} {...section("scope")}>
        <div className="icephys-fields">
          {hasSeq && (
            <ProtocolSelector
              nwbUrl={nwbUrl}
              repRow={undefined}
              value={scope.protoRow}
              onChange={setProtoRow}
              optionEnabled={
                haveProvenance
                  ? (o) => enabledProtoNames.has(o.label)
                  : undefined
              }
            />
          )}
          {hasCond && (
            <ConditionSelector
              nwbUrl={nwbUrl}
              value={scope.condRow}
              onChange={setCondRow}
              optionEnabled={
                haveProvenance ? (o) => enabledConds.has(o.row) : undefined
              }
            />
          )}
          {hasRep && (
            <RepetitionSelector
              nwbUrl={nwbUrl}
              condRow={undefined}
              value={scope.repRow}
              onChange={setRepRow}
              optionEnabled={
                haveProvenance ? (o) => enabledReps.has(o.row) : undefined
              }
            />
          )}
        </div>
      </AccordionItem>
      {plotting && (
        <AccordionItem title="Axes" summary={axesSummary} {...section("axes")}>
          <div className="icephys-fields">
            <SettingPair>
              <TextInput
                label="Window start"
                unit="ms"
                size="sm"
                inputMode="decimal"
                placeholder="Start"
                value={xWindowStr.start}
                onChange={(start) => setXWindowStr((w) => ({ ...w, start }))}
                error={windowError ?? undefined}
              />
              <TextInput
                label="Window end"
                unit="ms"
                size="sm"
                inputMode="decimal"
                placeholder="End"
                value={xWindowStr.end}
                onChange={(end) => setXWindowStr((w) => ({ ...w, end }))}
              />
            </SettingPair>
            <div className="icephys-actions">
              <Button
                size="sm"
                disabled={!windowSet}
                onClick={() => setXWindowStr({ start: "", end: "" })}
              >
                Whole sweep
              </Button>
            </div>
            {panelsBy !== "none" && (
              <Checkbox
                label="Lock y across panels"
                checked={lockY}
                onChange={setLockY}
                aria-describedby={lockYHelpId}
              />
            )}
            {panelsBy !== "none" && (
              <p id={lockYHelpId} className="icephys-help">
                One y scale per unit, so amplitudes compare. Off, each panel
                scales to its own sweeps.
              </p>
            )}
          </div>
        </AccordionItem>
      )}
      {facetLegend && facetLegend.order.length > 0 && (
        <AccordionItem
          title="Colors"
          summary={axisLabel(legendAxis)}
          {...section("colors")}
        >
          <FacetLegend
            label={`Colors by ${axisLabel(legendAxis)}`}
            categorical={facetLegend}
          />
        </AccordionItem>
      )}
      {facetCounts && (
        <AccordionItem
          title="Sweeps per panel"
          summary={plural(
            facetCounts.rowOrder.length *
              (facetCounts.twoD ? facetCounts.colOrder.length : 1),
            "panel",
          )}
          {...section("counts")}
        >
          <DataTable
            caption="Sweeps per panel"
            columns={countColumns}
            rows={facetCounts.rowOrder}
            rowKey={(rk) => rk}
            density="compact"
          />
        </AccordionItem>
      )}
      {shouldRender &&
        selSweeps.length > 0 &&
        (dfShared.length > 0 || dfVaryingCols.length > 0) && (
          <AccordionItem
            title={
              selSweeps.length === 1 ? "Selected sweep" : "Selected sweeps"
            }
            summary={plural(selSweeps.length, "sweep")}
            {...section("sweeps")}
          >
            <div className="icephys-sweeps">
              {dfShared.length > 0 && (
                <p className="icephys-help">
                  {`Same for all: ${dfShared.map((s) => `${s.header} ${s.value}`).join(" · ")}`}
                </p>
              )}
              {dfVaryingCols.length > 0 && (
                <>
                  {selSweeps.length > dfRows.length && (
                    <p className="icephys-help">
                      {`The first ${dfRows.length} of ${selSweeps.length}`}
                    </p>
                  )}
                  <DataTable
                    caption="Selected sweeps"
                    columns={sweepColumns}
                    rows={dfRows}
                    rowKey={(s) => String(s.irtRow)}
                    density="compact"
                  />
                </>
              )}
            </div>
          </AccordionItem>
        )}
    </>
  );

  const drawChart = ({ width, height }: Size) => {
    const chartHeight = Math.max(0, height - (showTimeline ? TIMELINE_H : 0));
    return (
      <>
        {resolvedPanels === "none" ? (
          <FamilyOverlayPlot
            sweeps={sweepData.loaded}
            width={width}
            height={chartHeight}
            groupBy={resolvedColor}
            xRangeMs={xRangeMs}
          />
        ) : resolvedPanels2 === "none" ? (
          <FamilySeparatePanels
            sweeps={sweepData.loaded}
            width={width}
            height={chartHeight}
            splitBy={resolvedPanels}
            innerGroupBy={innerColor}
            xRangeMs={xRangeMs}
            yRangeByUnit={yRangeByUnit}
          />
        ) : (
          <FamilyFacetGrid
            sweeps={sweepData.loaded}
            width={width}
            height={chartHeight}
            rowAxis={resolvedPanels}
            colAxis={resolvedPanels2}
            innerGroupBy={innerColor}
            xRangeMs={xRangeMs}
            yRangeByUnit={yRangeByUnit}
          />
        )}
        {showTimeline && (
          <TemporalDistribution
            times={sweepTimes.times}
            contextTimes={contextTimes.times}
            loading={sweepTimes.loading}
            width={width}
            groupBy={timelineColor}
          />
        )}
      </>
    );
  };

  return (
    <div ref={frame} className="icephys">
      <ViewPanel
        label="Intracellular recordings"
        summary={summary || "Reading the icephys tables…"}
        controls={controls}
        settings={settings}
        busy={table.loading || sweepData.loading}
      >
        <div className="icephys-plot">
          {table.error && !unsupported && (
            <InlineMessage status="error">
              {`Couldn’t read the icephys tables: ${table.error}`}
            </InlineMessage>
          )}
          {sweepData.error && (
            <InlineMessage status="error">
              {`Couldn’t load the sweeps: ${sweepData.error}`}
            </InlineMessage>
          )}
          {table.loading && (
            <LoadingState
              label="Reading the icephys tables"
              phase={tablePhase}
            />
          )}
          {!table.loading && unsupported && (
            <EmptyState title="This file can’t be drawn yet">
              Neurosift plots intracellular recordings from files it reads
              through LINDI, and this one isn’t.
            </EmptyState>
          )}
          {ready && !shouldRender && (
            <EmptyState
              title="Choose what to plot"
              action={
                pickAll && inScopeRows.length > 0
                  ? { label: "Plot all sweeps", onClick: pickAll }
                  : undefined
              }
            >
              {`Pick a protocol, condition or repetition in Scope. This file has ${plural(inScopeRows.length, "sweep")}.`}
            </EmptyState>
          )}
          {ready &&
            shouldRender &&
            !table.error &&
            inScopeRows.length === 0 && (
              <EmptyState title="No sweeps match this scope">
                The chosen protocol isn’t recorded in the chosen condition or
                repetition. Set a filter back to All, or pick another.
              </EmptyState>
            )}
          {plotting && sweepData.loading && (
            <ProgressBar
              label="Loading sweeps"
              value={sweepData.loaded.length}
              max={sweepsToLoad.length}
              unit="sweeps"
            />
          )}
          {plotting && <ChartArea>{drawChart}</ChartArea>}
        </div>
      </ViewPanel>
    </div>
  );
};

type Size = { width: number; height: number };

/** A Color or Panels axis, its label beside the field as in the time views. */
const AxisSelect: FunctionComponent<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}> = ({ label, ...select }) => (
  <div className="ns-time-group icephys-axis">
    <span className="ns-time-label" aria-hidden="true">
      {label}
    </span>
    <Select label={label} hideLabel size="sm" {...select} />
  </div>
);

/** Measures the space left under the messages, so the charts are drawn to fit it. */
const ChartArea: FunctionComponent<{ children: (size: Size) => ReactNode }> = ({
  children,
}) => {
  const [ref, size] = useElementSize<HTMLDivElement>();
  return (
    <div ref={ref} className="icephys-chart">
      <div className="icephys-chart-fill">
        {size.width > 0 && size.height > 0 && children(size)}
      </div>
    </div>
  );
};

export default IcephysTabView;
