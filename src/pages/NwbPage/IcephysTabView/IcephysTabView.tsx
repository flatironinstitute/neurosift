import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { getHdf5Group } from "../hdf5Interface";
import ConditionSelector from "./ConditionSelector";
import FamilyOverlayPlot from "./FamilyOverlayPlot";
import FamilySeparatePanels from "./FamilySeparatePanels";
import ProtocolSelector from "./ProtocolSelector";
import RepetitionSelector from "./RepetitionSelector";
import TemporalDistribution from "./TemporalDistribution";
import { ALL_ROW, ScopeSelection, useChain } from "./useChain";
import { useSweepData } from "./useSweepData";
import { useSweepTimes } from "./useSweepTimes";

interface IcephysTabViewProps {
  nwbUrl: string;
  width: number;
  height: number;
  isExpanded: boolean;
}

const SIDEBAR_WIDTH = 320;
const MAX_SWEEPS_AUTO = 60;

// Stable empty scope for resolving the full-session sweep set (used by the
// expanded timeline's whole-session context backdrop).
const EMPTY_SCOPE: ScopeSelection = {};

const IcephysTabView: FunctionComponent<IcephysTabViewProps> = ({
  nwbUrl,
  width,
  height,
  isExpanded,
}) => {
  const [hasIcephys, setHasIcephys] = useState<boolean | null>(null);
  const [scope, setScope] = useState<ScopeSelection>({});
  const [forceRender, setForceRender] = useState(false);
  // Encoding channels (the "how to compare" controls, shown above the plot).
  // Filters (Condition/Repetition) stay in the sidebar as the "what" controls.
  const [colorBy, setColorBy] = useState<
    "auto" | "condition" | "repetition" | "electrode"
  >("auto");
  const [panelsBy, setPanelsBy] = useState<
    "none" | "protocol" | "condition" | "repetition" | "electrode"
  >("none");

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

  // Protocol is the anchor; Condition/Repetition are filters that narrow it.
  // Changing a filter keeps the chosen Protocol. Condition contains Repetition,
  // so changing Condition resets Repetition.
  const setProtoRow = (v: number | undefined) =>
    setScope((s) => ({ ...s, protoRow: v }));
  const setCondRow = (v: number | undefined) =>
    setScope((s) => ({ protoRow: s.protoRow, condRow: v }));
  const setRepRow = (v: number | undefined) =>
    setScope((s) => ({ protoRow: s.protoRow, condRow: s.condRow, repRow: v }));

  const chain = useChain(nwbUrl, scope);

  // Render gate: any explicit selection at any tier commits to rendering.
  // The MAX_SWEEPS_AUTO cap is the only safety net against runaway renders;
  // for large scopes the user sees the yellow "Large scope" card with the
  // suggested narrower tiers and a Render-anyway button rather than an
  // automatic 191-sweep fetch storm.
  const hasAnySelection =
    scope.condRow !== undefined ||
    scope.repRow !== undefined ||
    scope.protoRow !== undefined;

  // Flat files (only intracellular_recordings; no Condition/Repetition/Protocol
  // tier to pick) have nothing to select, so render the whole family
  // automatically. Otherwise wait for an explicit pick.
  const hasNarrowableTier =
    chain.chainDepth.includes("experimental_conditions") ||
    chain.chainDepth.includes("repetitions") ||
    chain.chainDepth.includes("sequential_recordings");
  const shouldRender =
    hasAnySelection || (!hasNarrowableTier && chain.availableSweeps.length > 0);

  const wouldRender = chain.sweeps.length;
  const exceedsCap =
    shouldRender && wouldRender > MAX_SWEEPS_AUTO && !forceRender;
  const sweepsToLoad = !shouldRender || exceedsCap ? [] : chain.sweeps;
  const sweepData = useSweepData(nwbUrl, sweepsToLoad);

  // Default ("auto") color grouping: by Protocol unless a specific Protocol is
  // pinned (then by sweep). The Color-by control can override this.
  const autoColor: "protocol" | "sweep" =
    scope.protoRow === ALL_ROW || scope.protoRow === undefined
      ? "protocol"
      : "sweep";

  // The temporal distribution is metadata-only (starting_time + rate), so we
  // compute it for the full in-scope sweep set even when that exceeds the
  // render cap. Seeing where/when the sweeps fall is exactly what helps decide
  // whether to commit to a heavy render.
  const sweepTimes = useSweepTimes(nwbUrl, shouldRender ? chain.sweeps : []);

  // Whole-session sweep set + times: a gray backdrop showing the overall time
  // structure of the recording, with the current selection highlighted on top.
  // Metadata-only (starting_time + rate), so cheap even for the full session.
  const showTimeline =
    shouldRender && !chain.loading && chain.error !== "UNSUPPORTED_ASSET";
  const fullChain = useChain(nwbUrl, EMPTY_SCOPE);
  const contextTimes = useSweepTimes(
    nwbUrl,
    showTimeline ? fullChain.availableSweeps : [],
  );

  // An axis can be a Color or Panels channel only if it actually VARIES within
  // the current scope (filtering to one repetition leaves nothing to compare
  // across repetitions). Derived from the in-scope sweep provenance.
  const distinctConds = new Set(
    chain.availableSweeps.map((s) => s.condRow).filter((x) => x !== undefined),
  ).size;
  const distinctReps = new Set(
    chain.availableSweeps.map((s) => s.repRow).filter((x) => x !== undefined),
  ).size;
  const distinctProtocols = new Set(
    chain.availableSweeps.map((s) => s.protocolLabel ?? `seq ${s.seqRow}`),
  ).size;
  const distinctElectrodes = new Set(
    chain.availableSweeps
      .map((s) => s.electrode)
      .filter((x) => x !== undefined),
  ).size;
  const condVaries = distinctConds >= 2;
  const repVaries = distinctReps >= 2;
  const protocolVaries = distinctProtocols >= 2;
  const electrodeVaries = distinctElectrodes >= 2;

  // File-wide data summary for the sidebar (always-on orientation), from the
  // whole-session sweep set.
  const fileSweeps = fullChain.availableSweeps;
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

  // Selection metadata: distinct values of each custom per-sweep column over the
  // in-scope sweeps (surfaces lab columns like protocol_type LP/SP, run, etc.).
  const selectionMeta: { name: string; display: string }[] = [];
  for (const col of chain.customColumns ?? []) {
    const vals = new Set<string>();
    for (const s of chain.sweeps) {
      const v = col.values[s.irtRow];
      if (v !== undefined && v !== "") vals.add(v);
    }
    if (vals.size === 0) continue;
    const arr = [...vals];
    const display =
      arr.length === 1
        ? arr[0]
        : arr.length <= 3
          ? arr.join(", ")
          : `${arr.length} values`;
    selectionMeta.push({ name: col.name, display });
  }

  // Resolve the two encoding channels, falling back when the chosen axis does
  // not vary (guards the render against a stale pick).
  const resolvedColor:
    | "protocol"
    | "sweep"
    | "condition"
    | "repetition"
    | "electrode" =
    colorBy === "condition" && condVaries
      ? "condition"
      : colorBy === "repetition" && repVaries
        ? "repetition"
        : colorBy === "electrode" && electrodeVaries
          ? "electrode"
          : autoColor;
  const resolvedPanels:
    | "none"
    | "protocol"
    | "condition"
    | "repetition"
    | "electrode" =
    panelsBy === "protocol" && protocolVaries
      ? "protocol"
      : panelsBy === "condition" && condVaries
        ? "condition"
        : panelsBy === "repetition" && repVaries
          ? "repetition"
          : panelsBy === "electrode" && electrodeVaries
            ? "electrode"
            : "none";
  // Inside a panel split by axis X, coloring by X is constant, so fall back to
  // a per-sweep gradient within each panel.
  const innerColor:
    | "protocol"
    | "sweep"
    | "condition"
    | "repetition"
    | "electrode" = resolvedColor === resolvedPanels ? "sweep" : resolvedColor;

  // Reset stale encoding picks (e.g. after switching files or filtering).
  useEffect(() => {
    if (colorBy === "condition" && !condVaries) setColorBy("auto");
    if (colorBy === "repetition" && !repVaries) setColorBy("auto");
    if (colorBy === "electrode" && !electrodeVaries) setColorBy("auto");
  }, [colorBy, condVaries, repVaries, electrodeVaries]);
  useEffect(() => {
    const ok =
      (panelsBy === "protocol" && protocolVaries) ||
      (panelsBy === "condition" && condVaries) ||
      (panelsBy === "repetition" && repVaries) ||
      (panelsBy === "electrode" && electrodeVaries);
    if (panelsBy !== "none" && !ok) setPanelsBy("none");
  }, [panelsBy, protocolVaries, condVaries, repVaries, electrodeVaries]);

  // List of tiers that exist in this file's chain but the user has not yet
  // narrowed. Used in the "Large scope" warning to suggest concrete next
  // picks the user can make to bring the sweep count under the cap.
  const unsetNarrowableTiers: string[] = [];
  if (
    chain.chainDepth.includes("experimental_conditions") &&
    scope.condRow === undefined
  )
    unsetNarrowableTiers.push("Condition");
  if (chain.chainDepth.includes("repetitions") && scope.repRow === undefined)
    unsetNarrowableTiers.push("Repetition");
  if (
    chain.chainDepth.includes("sequential_recordings") &&
    scope.protoRow === undefined
  )
    unsetNarrowableTiers.push("Protocol");

  // reset force-render whenever scope changes
  useEffect(() => {
    setForceRender(false);
  }, [scope.condRow, scope.repRow, scope.protoRow]);

  const plotWidth = useMemo(() => width - SIDEBAR_WIDTH - 32, [width]);
  const plotHeight = useMemo(() => height - 32, [height]);

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

  const hasCond = chain.chainDepth.includes("experimental_conditions");
  const hasRep = chain.chainDepth.includes("repetitions");
  const hasSeq = chain.chainDepth.includes("sequential_recordings");

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

        {/* Protocol is the anchor (lists all protocols, independent of the
            Condition/Repetition filters below). */}
        {hasSeq && (
          <ProtocolSelector
            nwbUrl={nwbUrl}
            repRow={undefined}
            value={scope.protoRow}
            onChange={setProtoRow}
          />
        )}
        {hasCond && (
          <ConditionSelector
            nwbUrl={nwbUrl}
            value={scope.condRow}
            onChange={setCondRow}
          />
        )}
        {hasRep && (
          <RepetitionSelector
            nwbUrl={nwbUrl}
            condRow={scope.condRow}
            value={scope.repRow}
            onChange={setRepRow}
          />
        )}

        <h3 style={{ marginTop: 24, marginBottom: 8 }}>This recording</h3>
        <div
          style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}
          title={`${chain.chainDepth.length}/5 icephys tables present: ${chain.chainDepth.join(", ")}`}
        >
          {fileSummary.length ? fileSummary.join(" · ") : "..."}{" "}
          <span style={{ color: "#aaa", cursor: "help" }}>&#9432;</span>
        </div>

        {shouldRender && selectionMeta.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#666",
                marginBottom: 4,
              }}
            >
              Selection
            </div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>
              {selectionMeta.map((m) => (
                <div key={m.name}>
                  <span style={{ color: "#888" }}>{m.name}:</span> {m.display}
                </div>
              ))}
            </div>
          </div>
        )}

        {chain.error && chain.error !== "UNSUPPORTED_ASSET" && (
          <div style={{ marginTop: 12, color: "#b00", fontSize: 12 }}>
            chain error: {chain.error}
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
        {chain.loading && (
          <div style={{ color: "#888" }}>resolving chain...</div>
        )}

        {!chain.loading && chain.error === "UNSUPPORTED_ASSET" && (
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

        {!chain.loading &&
          chain.error !== "UNSUPPORTED_ASSET" &&
          !shouldRender && (
            <div style={{ color: "#888", padding: 16, fontSize: 13 }}>
              Pick anything in the sidebar to start. Each pick narrows the
              scope; the plot renders once at least one tier is set (and the
              resulting sweep count is under {MAX_SWEEPS_AUTO}).
              {chain.availableSweeps.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#aaa" }}>
                  ({chain.availableSweeps.length} sweeps in this file)
                </div>
              )}
            </div>
          )}

        {!chain.loading && shouldRender && exceedsCap && (
          <div
            style={{
              padding: 16,
              border: "1px solid #fc0",
              background: "#fffbe6",
              borderRadius: 4,
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Large scope selected
            </div>
            <div style={{ color: "#666" }}>
              This selection would render {wouldRender} sweeps; the auto-render
              cap is {MAX_SWEEPS_AUTO}.
            </div>
            {unsetNarrowableTiers.length > 0 && (
              <div style={{ color: "#666", marginTop: 6 }}>
                To narrow, pick a{" "}
                {unsetNarrowableTiers.map((t, i) => (
                  <span key={t}>
                    {i > 0 &&
                      (i === unsetNarrowableTiers.length - 1 ? " or " : ", ")}
                    <strong>{t}</strong>
                  </span>
                ))}{" "}
                from the sidebar.
              </div>
            )}
            <button
              onClick={() => setForceRender(true)}
              style={{ marginTop: 8, padding: "4px 10px", fontSize: 12 }}
            >
              Render anyway
            </button>
          </div>
        )}

        {!chain.loading && shouldRender && !exceedsCap && (
          <>
            {/* Encoding bar: how to compare (filters live in the sidebar). */}
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
                        | "condition"
                        | "repetition"
                        | "electrode",
                    )
                  }
                  style={{ fontSize: 12, padding: "2px 4px" }}
                >
                  <option value="auto">auto</option>
                  {condVaries && <option value="condition">Condition</option>}
                  {repVaries && <option value="repetition">Repetition</option>}
                  {electrodeVaries && (
                    <option value="electrode">Electrode</option>
                  )}
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
                        | "electrode",
                    )
                  }
                  style={{ fontSize: 12, padding: "2px 4px" }}
                >
                  <option value="none">none</option>
                  {protocolVaries && <option value="protocol">Protocol</option>}
                  {condVaries && <option value="condition">Condition</option>}
                  {repVaries && <option value="repetition">Repetition</option>}
                  {electrodeVaries && (
                    <option value="electrode">Electrode</option>
                  )}
                </select>
              </label>
            </div>
            {sweepData.loading && (
              <div style={{ color: "#888", marginBottom: 8 }}>
                loading sweeps ({sweepData.loaded.length}/{chain.sweeps.length}
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
              />
            ) : (
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
            groupBy={resolvedColor}
            panelsBy={resolvedPanels}
          />
        )}
      </div>
    </div>
  );
};

export default IcephysTabView;
