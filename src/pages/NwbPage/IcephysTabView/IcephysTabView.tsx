import {
  CSSProperties,
  FunctionComponent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getHdf5Group } from "../hdf5Interface";
import ConditionSelector from "./ConditionSelector";
import FacetLegend, { facetColors } from "./FacetLegend";
import FamilyFacetGrid from "./FamilyFacetGrid";
import FamilyOverlayPlot, { pickDisplayUnit } from "./FamilyOverlayPlot";
import FamilySeparatePanels from "./FamilySeparatePanels";
import ProtocolSelector from "./ProtocolSelector";
import RepetitionSelector from "./RepetitionSelector";
import TemporalDistribution from "./TemporalDistribution";
import { ALL_ROW, ResolvedSweep, ScopeSelection } from "./useChain";
import { IcephysRow, useIcephysTable } from "./useIcephysTable";
import { useSweepData } from "./useSweepData";
import { useSweepTimes } from "./useSweepTimes";

interface IcephysTabViewProps {
  nwbUrl: string;
  width: number;
  height: number;
  isExpanded: boolean;
}

const SIDEBAR_WIDTH = 320;
// Large families are sampled rather than blocked: plot this many evenly-spaced
// sweeps by default (overlay), with "plot more" / "plot all" to expand.
const SAMPLE_SIZE = 30;
// When faceted (Panels by set), sample each panel independently up to this many
// sweeps, so every category is represented rather than dropped for being a small
// share of the total. Scales with the same expand control as SAMPLE_SIZE.
const PANEL_SAMPLE_SIZE = 12;
// Above this many sweeps, "plot all" carries a "may be slow" caution.
const PLOT_ALL_WARN = 60;
// The app's global StatusBarDiv (the "v0.1.0 ..." footer) is position:absolute
// and overlays the bottom ~21px of the content area. The tab is handed a height
// that does not exclude it, so reserve it here; otherwise the timeline strip
// (pinned at the bottom) has its session-time axis labels painted over by it.
const STATUS_BAR_H = 24;

// Panel grouping key for sampling, matching FamilySeparatePanels.groupOf so the
// sampled groups line up with the panels actually rendered.
function panelKey(
  sw: ResolvedSweep,
  axis: "protocol" | "condition" | "repetition" | "electrode" | "cell",
): string {
  if (axis === "condition") return `c${sw.condRow ?? -1}`;
  if (axis === "repetition") return `r${sw.repRow ?? -1}`;
  if (axis === "electrode") return `e:${sw.electrode ?? "?"}`;
  if (axis === "cell") return `cell:${sw.cell ?? "?"}`;
  return `p:${sw.protocolLabel || `seq ${sw.seqRow}`}`;
}

// Evenly-spaced indices [0..total) of size <= n, inclusive of the first and last
// so a sampled view of an ordered family spans its full range (light -> dark)
// rather than just the head. Returns every index when total <= n.
function sampleIndices(total: number, n: number): number[] {
  if (total <= 0) return [];
  if (total <= n) return Array.from({ length: total }, (_, i) => i);
  if (n <= 1) return [0];
  const out: number[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * (total - 1)) / (n - 1));
    if (!seen.has(idx)) {
      seen.add(idx);
      out.push(idx);
    }
  }
  return out;
}

// A scope row value is a real selection (not the "All" sentinel and not unset).
const isSpecificRow = (v: number | undefined): v is number =>
  v !== undefined && v !== ALL_ROW;

// --- URL persistence of the icephys view ----------------------------------
// The tab serializes its selection (Protocol/Condition/Repetition) and encoding
// (Color by / Panels by / & by / window / lock y) into namespaced query params,
// so a refresh or a copied link reproduces the view. Params are written with
// replace (no history churn) and omitted at their default value (a fresh file
// stays a clean URL). Read values are seeds only: the existing cardinality
// gating and reset logic still validate them against the actual file.
const COLOR_BY_VALUES = [
  "auto",
  "protocol",
  "condition",
  "repetition",
  "electrode",
  "cell",
] as const;
const PANELS_BY_VALUES = [
  "none",
  "protocol",
  "condition",
  "repetition",
  "electrode",
  "cell",
] as const;

function numParam(sp: URLSearchParams, key: string): number | undefined {
  const v = sp.get(key);
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function enumParam<T extends string>(
  sp: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const v = sp.get(key);
  return v !== null && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

// Selected-sweeps table cell styles.
const selThStyle: CSSProperties = {
  textAlign: "left",
  padding: "2px 6px",
  borderBottom: "1px solid #ddd",
  position: "sticky",
  top: 0,
  background: "#fff",
  whiteSpace: "nowrap",
  fontWeight: 600,
  color: "#666",
};
const selTdStyle: CSSProperties = {
  padding: "2px 6px",
  borderBottom: "1px solid #f0f0f0",
  whiteSpace: "nowrap",
};

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
  // Encoding channels (the "how to compare" controls, shown above the plot).
  // Filters (Condition/Repetition) stay in the sidebar as the "what" controls.
  const [colorBy, setColorBy] = useState<
    "auto" | "protocol" | "condition" | "repetition" | "electrode" | "cell"
  >(() => enumParam(searchParams, "icephysColorBy", COLOR_BY_VALUES, "auto"));
  const [panelsBy, setPanelsBy] = useState<
    "none" | "protocol" | "condition" | "repetition" | "electrode" | "cell"
  >(() => enumParam(searchParams, "icephysPanelsBy", PANELS_BY_VALUES, "none"));
  // Optional second panel axis -> 2-D facet grid (rows = panelsBy, cols = this).
  const [panelsBy2, setPanelsBy2] = useState<
    "none" | "protocol" | "condition" | "repetition" | "electrode" | "cell"
  >(() => enumParam(searchParams, "icephysAndBy", PANELS_BY_VALUES, "none"));
  // Within-sweep x-window crop (ms), shared across all panels. Empty = full range.
  const [xWindowStr, setXWindowStr] = useState<{ start: string; end: string }>(
    () => ({
      start: searchParams.get("icephysWindowStart") ?? "",
      end: searchParams.get("icephysWindowEnd") ?? "",
    }),
  );
  // Lock the y-axis to a shared range across facet panels (per display unit) so
  // amplitudes are comparable. Opt-in (off by default): computing the shared
  // range is a pass over the loaded sample data, so it runs only when the user
  // turns it on, and only once the sample has loaded. Users can still box-zoom /
  // double-click each panel; unchecking releases the lock (autorange).
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

  // Reset selection + encoding when switching files: a selection valid in one
  // file may be invalid in another. Skip the first run so URL-seeded state (a
  // refresh / shared link) survives the initial mount; reset only on a real
  // file change.
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

  // Mirror the icephys view into the URL (replace, default-omit) so a refresh or
  // a copied link reproduces it. All synced controls are discrete, so this is
  // one cheap replaceState per change; the equality guard prevents a navigate
  // loop (after navigate, searchParams equals p, so the next run is a no-op).
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
      navigate(`?${p.toString()}`, { replace: true });
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

  // Protocol is the anchor; Condition/Repetition are filters that narrow it.
  // Changing a filter keeps the chosen Protocol. Condition contains Repetition,
  // so changing Condition resets Repetition.
  const setProtoRow = (v: number | undefined) =>
    setScope((s) => ({ ...s, protoRow: v }));
  const setCondRow = (v: number | undefined) =>
    setScope((s) => ({ protoRow: s.protoRow, condRow: v }));
  const setRepRow = (v: number | undefined) =>
    setScope((s) => ({ protoRow: s.protoRow, condRow: s.condRow, repRow: v }));

  // The whole file is resolved once into a tidy table; scope is then applied in
  // memory (no per-selection chain re-walk). Protocol aggregates by name (the
  // picked protoRow is a representative sequential_recordings row, so all rows
  // sharing its stimulus_type are in scope); Condition/Repetition match by row.
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

  // Render gate: any explicit selection at any tier commits to rendering.
  // A large family is not blocked; it is sampled (an evenly-spaced subset is
  // plotted, with "plot more"/"plot all" to expand), so there is no runaway
  // full-family fetch on the first paint.
  const hasAnySelection =
    scope.condRow !== undefined ||
    scope.repRow !== undefined ||
    scope.protoRow !== undefined;

  // Flat files (only intracellular_recordings; no Condition/Repetition/Protocol
  // tier to pick) have nothing to select, so render the whole family
  // automatically. Otherwise wait for an explicit pick.
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

  // The temporal distribution is metadata-only (starting_time + rate), so we
  // compute it for the full in-scope sweep set even when only a sample is
  // plotted. Seeing where/when every sweep falls is the full-family context.
  const sweepTimes = useSweepTimes(nwbUrl, shouldRender ? inScopeRows : []);

  // Whole-session sweep set + times: a gray backdrop showing the overall time
  // structure of the recording, with the current selection highlighted on top.
  // Metadata-only (starting_time + rate), so cheap even for the full session.
  const showTimeline =
    shouldRender && !table.loading && table.error !== "UNSUPPORTED_ASSET";
  const contextTimes = useSweepTimes(nwbUrl, showTimeline ? table.rows : []);

  // An axis can be a Color or Panels channel only if it actually VARIES within
  // the current scope (filtering to one repetition leaves nothing to compare
  // across repetitions). Derived from the in-scope sweep provenance.
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

  // File-wide data summary for the sidebar (always-on orientation), from the
  // whole-session sweep set.
  const fileSweeps = table.rows;
  const fileSummary: string[] = [];
  if (fileSweeps.length) {
    const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
    const nP = new Set(fileSweeps.map((s) => s.protocolLabel).filter(Boolean))
      .size;
    const nR = new Set(
      fileSweeps.map((s) => s.repRow).filter((x) => x !== undefined),
    ).size;
    const nC = new Set(
      fileSweeps.map((s) => s.condRow).filter((x) => x !== undefined),
    ).size;
    const nE = new Set(fileSweeps.map((s) => s.electrode).filter(Boolean)).size;
    fileSummary.push(plural(fileSweeps.length, "sweep"));
    if (nP > 0) fileSummary.push(plural(nP, "protocol"));
    if (nR > 0) fileSummary.push(plural(nR, "repetition"));
    if (nC > 0) fileSummary.push(plural(nC, "condition"));
    if (nE > 0) fileSummary.push(plural(nE, "electrode"));
  }

  // Cross-filter: enabled values per filter axis = those that co-occur with the
  // OTHER axes' current selections. Disabled (greyed) options can't be picked,
  // so an empty Protocol + Condition + Repetition combination can't be built.
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

  // Selection table: the slice of the intracellular_recordings table for the
  // selected sweeps. Information criterion (same as selectors): a column becomes
  // a table column only if it VARIES across the selection; columns that are
  // constant collapse into a single "shared" line, rather than repeating one
  // value down every row.
  // The table is metadata-only short strings in a scrolling box, so show every
  // selected sweep. A low cap (e.g. 20) is actively misleading: rows are in
  // sweep order, so the first N can all share one protocol while later sweeps
  // span others, making a genuinely-varying column look constant. The high cap
  // is just a DOM-size backstop for pathological flat files; real icephys
  // scopes are well under it.
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
  const resolvedColor:
    | "protocol"
    | "sweep"
    | "condition"
    | "repetition"
    | "electrode"
    | "cell" =
    colorBy === "protocol" && protocolVaries
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
  const resolvedPanels:
    | "none"
    | "protocol"
    | "condition"
    | "repetition"
    | "electrode"
    | "cell" =
    panelsBy === "protocol" && protocolVaries
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
  const resolvedPanels2:
    | "none"
    | "protocol"
    | "condition"
    | "repetition"
    | "electrode"
    | "cell" =
    resolvedPanels === "none"
      ? "none"
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
              : panelsBy2 === "cell" && cellVaries && resolvedPanels !== "cell"
                ? "cell"
                : "none";
  // Inside a panel, the panel axis (or axes) is constant, so coloring by it would
  // be flat; fall back to a per-sweep gradient.
  const innerColor:
    | "protocol"
    | "sweep"
    | "condition"
    | "repetition"
    | "electrode"
    | "cell" =
    resolvedColor === resolvedPanels || resolvedColor === resolvedPanels2
      ? "sweep"
      : resolvedColor;

  // Within-sweep x-window crop (ms). Valid only when both ends parse and end >
  // start; otherwise null (autorange). Shared across all panels.
  const xwStart = parseFloat(xWindowStr.start);
  const xwEnd = parseFloat(xWindowStr.end);
  const xRangeMs: [number, number] | null =
    Number.isFinite(xwStart) && Number.isFinite(xwEnd) && xwEnd > xwStart
      ? [xwStart, xwEnd]
      : null;

  // Sampling: render an evenly-spaced subset so a large family paints fast.
  // - Overlay (Panels by = none): one global stride of up to `sampleLimit`.
  // - Faceted (Panels by set): sample each panel independently up to `perPanelCap`,
  //   so every category is represented (a small panel is not dropped for being a
  //   small share of the total). The per-panel cap scales with the same control,
  //   so "plot more"/"plot all" grow both modes. The metadata-only timeline below
  //   always shows every sweep.
  const perPanelCap = Math.max(
    1,
    Math.round((PANEL_SAMPLE_SIZE / SAMPLE_SIZE) * sampleLimit),
  );
  let sweepsToLoad: ResolvedSweep[] = [];
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

  // Shared y-range per display unit (mV, pA, ...) across faceted panels, so a
  // locked y makes amplitudes comparable. Only computed for faceted views, and
  // only once the sample has loaded (avoids repeated full passes mid-load).
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

  // Faceted-view color legend, rendered in the sidebar (the plot area is busy).
  // Keyed to the inner-color axis when it is categorical, otherwise to the panel
  // axis (whose per-panel hue is the categorical encoding). Colors are computed
  // the same way the panels assign them, so the legend matches.
  const legendAxis = innerColor !== "sweep" ? innerColor : resolvedPanels;
  const facetLegend =
    resolvedPanels !== "none" &&
    legendAxis !== "none" &&
    sweepData.loaded.length > 0
      ? facetColors(sweepData.loaded, legendAxis)
      : null;

  // The timeline mirrors the visible categorical encoding: color by the Color
  // axis when it is categorical, otherwise by the Panels axis. So when Color by
  // = auto resolves to a per-sweep gradient but Panels splits by (say)
  // repetition, the timeline picks up the same categorical repetition colors.
  const timelineColorRaw =
    resolvedColor === "sweep" && resolvedPanels !== "none"
      ? resolvedPanels
      : resolvedColor;
  // The timeline strip has no Cell axis (its lanes are electrodes), so a
  // cell-colored selection is shown there by electrode instead.
  const timelineColor:
    | "protocol"
    | "sweep"
    | "condition"
    | "repetition"
    | "electrode" =
    timelineColorRaw === "cell" ? "electrode" : timelineColorRaw;

  // Reset stale encoding picks (e.g. after switching files or filtering).
  // Guarded by !table.loading: the *Varies flags come from inScopeRows,
  // which is empty while loading, so without this guard a URL-seeded encoding
  // axis would be reset to its default before the data arrives (it would look
  // like the axis does not vary). Once loaded, the gate runs and validates.
  useEffect(() => {
    if (table.loading) return;
    if (colorBy === "protocol" && !protocolVaries) setColorBy("auto");
    if (colorBy === "condition" && !condVaries) setColorBy("auto");
    if (colorBy === "repetition" && !repVaries) setColorBy("auto");
    if (colorBy === "electrode" && !electrodeVaries) setColorBy("auto");
    if (colorBy === "cell" && !cellVaries) setColorBy("auto");
  }, [
    colorBy,
    protocolVaries,
    condVaries,
    repVaries,
    electrodeVaries,
    cellVaries,
    table.loading,
  ]);
  useEffect(() => {
    if (table.loading) return;
    const ok =
      (panelsBy === "protocol" && protocolVaries) ||
      (panelsBy === "condition" && condVaries) ||
      (panelsBy === "repetition" && repVaries) ||
      (panelsBy === "electrode" && electrodeVaries) ||
      (panelsBy === "cell" && cellVaries);
    if (panelsBy !== "none" && !ok) setPanelsBy("none");
  }, [
    panelsBy,
    protocolVaries,
    condVaries,
    repVaries,
    electrodeVaries,
    cellVaries,
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
      (panelsBy2 === "cell" && cellVaries);
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
    table.loading,
  ]);

  // Reset the sample size to the default whenever scope changes, so a new
  // selection starts from a small evenly-spaced sample rather than a previously
  // expanded one.
  useEffect(() => {
    setSampleLimit(SAMPLE_SIZE);
  }, [scope.condRow, scope.repRow, scope.protoRow]);

  const plotWidth = useMemo(() => width - SIDEBAR_WIDTH - 32, [width]);
  const plotHeight = useMemo(() => height - 32 - STATUS_BAR_H, [height]);

  const timelineHeight = showTimeline ? 84 : 0;

  if (!isExpanded) return null;

  if (hasIcephys === null) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }
  if (!hasIcephys) {
    return (
      <div style={{ padding: 20, color: "#666" }}>
        This file does not contain intracellular electrophysiology data (no{" "}
        <code>/general/intracellular_ephys/intracellular_recordings</code>{" "}
        group).
      </div>
    );
  }

  const hasCond = table.chainDepth.includes("experimental_conditions");
  const hasRep = table.chainDepth.includes("repetitions");
  const hasSeq = table.chainDepth.includes("sequential_recordings");

  // Encoding bar (Color by / Panels by): how to compare. Rendered both above the
  // plot and above the "Large scope" cap card, so the comparison controls (e.g.
  // Color by = Electrode on a dual-electrode file) stay reachable even when the
  // broad selection is over the auto-render cap. Changing them does not change
  // the sweep count, so it is safe to keep them visible in the capped state.
  const encodingBar = (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        height: 28,
        marginBottom: 8,
        fontSize: 12,
        color: "#444",
      }}
    >
      <label>
        Color by{" "}
        <select
          value={colorBy}
          onChange={(e) =>
            setColorBy(
              e.target.value as
                | "auto"
                | "protocol"
                | "condition"
                | "repetition"
                | "electrode"
                | "cell",
            )
          }
          style={{ fontSize: 12, padding: "2px 4px" }}
        >
          <option value="auto">auto</option>
          {protocolVaries && <option value="protocol">Protocol</option>}
          {condVaries && <option value="condition">Condition</option>}
          {repVaries && <option value="repetition">Repetition</option>}
          {electrodeVaries && <option value="electrode">Electrode</option>}
          {cellVaries && <option value="cell">Cell</option>}
        </select>
      </label>
      <label>
        Panels by{" "}
        <select
          value={panelsBy}
          onChange={(e) =>
            setPanelsBy(
              e.target.value as
                | "none"
                | "protocol"
                | "condition"
                | "repetition"
                | "electrode"
                | "cell",
            )
          }
          style={{ fontSize: 12, padding: "2px 4px" }}
        >
          <option value="none">none</option>
          {protocolVaries && <option value="protocol">Protocol</option>}
          {condVaries && <option value="condition">Condition</option>}
          {repVaries && <option value="repetition">Repetition</option>}
          {electrodeVaries && <option value="electrode">Electrode</option>}
          {cellVaries && <option value="cell">Cell</option>}
        </select>
      </label>
      {panelsBy !== "none" && (
        <label>
          &amp; by{" "}
          <select
            value={panelsBy2}
            onChange={(e) =>
              setPanelsBy2(
                e.target.value as
                  | "none"
                  | "protocol"
                  | "condition"
                  | "repetition"
                  | "electrode"
                  | "cell",
              )
            }
            style={{ fontSize: 12, padding: "2px 4px" }}
          >
            <option value="none">none</option>
            {protocolVaries && panelsBy !== "protocol" && (
              <option value="protocol">Protocol</option>
            )}
            {condVaries && panelsBy !== "condition" && (
              <option value="condition">Condition</option>
            )}
            {repVaries && panelsBy !== "repetition" && (
              <option value="repetition">Repetition</option>
            )}
            {electrodeVaries && panelsBy !== "electrode" && (
              <option value="electrode">Electrode</option>
            )}
            {cellVaries && panelsBy !== "cell" && (
              <option value="cell">Cell</option>
            )}
          </select>
        </label>
      )}
      <label>
        window (ms){" "}
        <input
          type="number"
          value={xWindowStr.start}
          placeholder="start"
          onChange={(e) =>
            setXWindowStr((w) => ({ ...w, start: e.target.value }))
          }
          style={{ width: 56, fontSize: 12, padding: "2px 4px" }}
        />
        {" - "}
        <input
          type="number"
          value={xWindowStr.end}
          placeholder="end"
          onChange={(e) =>
            setXWindowStr((w) => ({ ...w, end: e.target.value }))
          }
          style={{ width: 56, fontSize: 12, padding: "2px 4px" }}
        />
        {(xWindowStr.start !== "" || xWindowStr.end !== "") && (
          <button
            onClick={() => setXWindowStr({ start: "", end: "" })}
            style={{ marginLeft: 4, fontSize: 11, padding: "1px 6px" }}
          >
            full
          </button>
        )}
      </label>
      {panelsBy !== "none" && (
        <label
          style={{ display: "flex", alignItems: "center", gap: 4 }}
          title="Share one y-scale across panels (per unit) so amplitudes are comparable. Off = each panel autoscales."
        >
          <input
            type="checkbox"
            checked={lockY}
            onChange={(e) => setLockY(e.target.checked)}
            style={{ margin: 0 }}
          />
          lock y
        </label>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", width, height, overflow: "hidden" }}>
      <div
        style={{
          width: SIDEBAR_WIDTH,
          height,
          borderRight: "1px solid #ddd",
          padding: 12,
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Scope</h3>

        {/* Protocol is the anchor (lists all protocols). Condition/Repetition
            are filters. All three cross-filter: an option is greyed when it
            does not co-occur with the other axes' current picks. */}
        {hasSeq && (
          <ProtocolSelector
            nwbUrl={nwbUrl}
            repRow={undefined}
            value={scope.protoRow}
            onChange={setProtoRow}
            optionEnabled={
              haveProvenance ? (o) => enabledProtoNames.has(o.label) : undefined
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

        <h3 style={{ marginTop: 24, marginBottom: 8 }}>Summary</h3>
        <div
          style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}
          title={`${table.chainDepth.length}/5 icephys tables present: ${table.chainDepth.join(", ")}`}
        >
          {fileSummary.length ? fileSummary.join(" · ") : "..."}{" "}
          <span style={{ color: "#aaa", cursor: "help" }}>&#9432;</span>
        </div>

        {shouldRender &&
          selSweeps.length > 0 &&
          (dfShared.length > 0 || dfVaryingCols.length > 0) && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#666",
                  marginBottom: 4,
                }}
              >
                {selSweeps.length === 1 ? "Selected sweep" : "Selected sweeps"}
                {dfVaryingCols.length > 0 && selSweeps.length > dfRows.length
                  ? ` (first ${dfRows.length} of ${selSweeps.length})`
                  : ""}
              </div>
              {dfShared.length > 0 && (
                <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
                  {dfShared.map((s) => `${s.header}: ${s.value}`).join(" · ")}
                </div>
              )}
              {dfVaryingCols.length > 0 && (
                <div style={{ maxHeight: 220, overflow: "auto" }}>
                  <table
                    style={{
                      borderCollapse: "collapse",
                      fontSize: 11,
                      color: "#444",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={selThStyle}>sweep</th>
                        {dfVaryingCols.map((c) => (
                          <th key={c.header} style={selThStyle}>
                            {c.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dfRows.map((s) => (
                        <tr key={s.irtRow}>
                          <td style={selTdStyle}>{s.irtRow}</td>
                          {dfVaryingCols.map((c) => (
                            <td key={c.header} style={selTdStyle}>
                              {c.get(s) ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        {facetLegend && facetLegend.order.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#666",
                marginBottom: 2,
              }}
            >
              Colors ({legendAxis})
            </div>
            <FacetLegend categorical={facetLegend} />
          </div>
        )}

        {table.error && table.error !== "UNSUPPORTED_ASSET" && (
          <div style={{ marginTop: 12, color: "#b00", fontSize: 12 }}>
            chain error: {table.error}
          </div>
        )}
        {sweepData.error && (
          <div style={{ marginTop: 12, color: "#b00", fontSize: 12 }}>
            data error: {sweepData.error}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          height,
          padding: 12,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {table.loading && (
          <div style={{ color: "#888" }}>resolving chain...</div>
        )}

        {!table.loading && table.error === "UNSUPPORTED_ASSET" && (
          <div
            style={{
              padding: 20,
              fontSize: 15,
              color: "#b00",
              maxWidth: 480,
            }}
          >
            Icephys visualization for this asset is not supported yet.
          </div>
        )}

        {!table.loading &&
          table.error !== "UNSUPPORTED_ASSET" &&
          !shouldRender && (
            <div style={{ color: "#888", padding: 16, fontSize: 13 }}>
              Pick anything in the sidebar to start. Each pick narrows the
              scope; the plot renders once at least one tier is set.
              {inScopeRows.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#aaa" }}>
                  (<strong>{inScopeRows.length}</strong> sweeps in this file)
                </div>
              )}
            </div>
          )}

        {!table.loading &&
          shouldRender &&
          inScopeRows.length > 0 &&
          encodingBar}

        {!table.loading &&
          shouldRender &&
          !table.error &&
          inScopeRows.length === 0 && (
            <div style={{ color: "#888", padding: 16, fontSize: 13 }}>
              No sweeps match this selection — the chosen Protocol isn't
              recorded in the selected Condition/Repetition. Clear a filter (set
              it back to "All" / unset) or pick a different one.
            </div>
          )}

        {!table.loading && shouldRender && inScopeRows.length > 0 && (
          <>
            {isSampled && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                  fontSize: 12,
                  color: "#666",
                }}
              >
                <span>
                  showing {sweepsToLoad.length} of{" "}
                  <strong>{inScopeRows.length}</strong> sweeps{" "}
                  {resolvedPanels === "none"
                    ? "(evenly spaced)"
                    : `(up to ${perPanelCap} per panel)`}
                </span>
                <button
                  onClick={() =>
                    setSampleLimit((l) => Math.min(inScopeRows.length, l * 2))
                  }
                  style={{ fontSize: 12, padding: "2px 8px" }}
                >
                  plot more
                </button>
                <button
                  onClick={() => setSampleLimit(inScopeRows.length)}
                  title={
                    inScopeRows.length > PLOT_ALL_WARN
                      ? "Rendering the whole family may be slow."
                      : undefined
                  }
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    ...(inScopeRows.length > PLOT_ALL_WARN
                      ? {
                          color: "#92600a",
                          border: "1px solid #e0a800",
                          background: "#fffbe6",
                        }
                      : {}),
                  }}
                >
                  plot all{inScopeRows.length > PLOT_ALL_WARN ? " (slow)" : ""}
                </button>
              </div>
            )}
            {sweepData.loading && (
              <div style={{ color: "#888", marginBottom: 8 }}>
                loading sweeps ({sweepData.loaded.length}/{inScopeRows.length}
                )...
              </div>
            )}
            {resolvedPanels === "none" ? (
              <FamilyOverlayPlot
                sweeps={sweepData.loaded}
                width={plotWidth}
                height={
                  plotHeight -
                  timelineHeight -
                  36 -
                  (sweepData.loading ? 24 : 0)
                }
                groupBy={resolvedColor}
                xRangeMs={xRangeMs}
              />
            ) : resolvedPanels2 === "none" ? (
              <FamilySeparatePanels
                sweeps={sweepData.loaded}
                width={plotWidth}
                height={
                  plotHeight -
                  timelineHeight -
                  36 -
                  (sweepData.loading ? 24 : 0)
                }
                splitBy={resolvedPanels}
                innerGroupBy={innerColor}
                xRangeMs={xRangeMs}
                yRangeByUnit={yRangeByUnit}
              />
            ) : (
              <FamilyFacetGrid
                sweeps={sweepData.loaded}
                width={plotWidth}
                height={
                  plotHeight -
                  timelineHeight -
                  36 -
                  (sweepData.loading ? 24 : 0)
                }
                rowAxis={resolvedPanels}
                colAxis={resolvedPanels2}
                innerGroupBy={innerColor}
                xRangeMs={xRangeMs}
                yRangeByUnit={yRangeByUnit}
              />
            )}
          </>
        )}

        {showTimeline && (
          <TemporalDistribution
            times={sweepTimes.times}
            contextTimes={contextTimes.times}
            loading={sweepTimes.loading}
            width={plotWidth}
            groupBy={timelineColor}
          />
        )}
      </div>
    </div>
  );
};

export default IcephysTabView;
