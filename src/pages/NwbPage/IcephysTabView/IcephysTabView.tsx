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
  // "Compare by" faceting: color the family overlay by condition or repetition
  // instead of by protocol/sweep. "none" leaves the default grouping.
  const [compareBy, setCompareBy] = useState<
    "none" | "condition" | "repetition"
  >("none");
  // Family layout: overlay everything in one plot, or one panel per group.
  const [layout, setLayout] = useState<"overlay" | "separate-panels">(
    "overlay",
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

  // Cascade-reset rules: changing an upper level clears everything below it.
  const setCondRow = (v: number | undefined) => setScope({ condRow: v });
  const setRepRow = (v: number | undefined) =>
    setScope((s) => ({ condRow: s.condRow, repRow: v }));
  const setProtoRow = (v: number | undefined) =>
    setScope((s) => ({ condRow: s.condRow, repRow: s.repRow, protoRow: v }));

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

  // Group sweeps the same way the family overlay does so the timeline colors
  // agree: by Protocol unless a specific Protocol is pinned.
  const groupBy: "protocol" | "sweep" =
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

  // "Compare by" is only meaningful for a tier that still VARIES within the
  // current selection: if you have pinned one repetition, there is nothing to
  // compare across repetitions. Derive this from the in-scope sweep provenance
  // (chain.availableSweeps reflects the current Condition/Repetition/Protocol
  // scope), not from table presence or the file-wide counts.
  const distinctConds = new Set(
    chain.availableSweeps.map((s) => s.condRow).filter((x) => x !== undefined),
  ).size;
  const distinctReps = new Set(
    chain.availableSweeps.map((s) => s.repRow).filter((x) => x !== undefined),
  ).size;
  const canCompareCond = distinctConds >= 2;
  const canCompareRep = distinctReps >= 2;

  // Apply the facet only if the chosen axis is actually comparable; otherwise
  // fall back to the default grouping (guards the render against a stale pick).
  const facetActive =
    (compareBy === "condition" && canCompareCond) ||
    (compareBy === "repetition" && canCompareRep);
  const familyGroupBy: "protocol" | "sweep" | "condition" | "repetition" =
    facetActive ? compareBy : groupBy;

  // Separate panels split the family into one panel per group; only meaningful
  // for a categorical grouping (not per-sweep).
  const canSeparatePanels = familyGroupBy !== "sweep";
  const useSeparatePanels = layout === "separate-panels" && canSeparatePanels;

  // Reset a now-unavailable facet pick (e.g. after switching files).
  useEffect(() => {
    if (compareBy !== "none" && !facetActive) setCompareBy("none");
  }, [compareBy, facetActive]);

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
        {hasSeq && (
          <ProtocolSelector
            nwbUrl={nwbUrl}
            repRow={scope.repRow}
            value={scope.protoRow}
            onChange={setProtoRow}
          />
        )}
        {/* Compare by: facet the family overlay by an upstream tier instead of
            pooling everything into one family. Only offered for tiers the file
            actually has. */}
        {(canCompareCond || canCompareRep) && (
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Compare by
            </label>
            <select
              value={compareBy}
              onChange={(e) =>
                setCompareBy(
                  e.target.value as "none" | "condition" | "repetition",
                )
              }
              style={{ width: "100%", padding: "6px 8px", fontSize: 13 }}
            >
              <option value="none">none</option>
              {canCompareCond && <option value="condition">Condition</option>}
              {canCompareRep && <option value="repetition">Repetition</option>}
            </select>
          </div>
        )}

        {/* Layout: overlay the groups, or show one panel per group. Only
            meaningful when there is a categorical grouping to split. */}
        {canSeparatePanels && (
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Layout
            </label>
            <select
              value={layout}
              onChange={(e) =>
                setLayout(e.target.value as "overlay" | "separate-panels")
              }
              style={{ width: "100%", padding: "6px 8px", fontSize: 13 }}
            >
              <option value="overlay">Overlay</option>
              <option value="separate-panels">Separate panels</option>
            </select>
          </div>
        )}

        <h3 style={{ marginTop: 24, marginBottom: 12 }}>Chain depth</h3>
        <div style={{ fontSize: 11, color: "#666" }}>
          {chain.chainDepth.length}/5 tables present:
          <ul style={{ marginTop: 4, paddingLeft: 16 }}>
            {chain.chainDepth.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

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
            {sweepData.loading && (
              <div style={{ color: "#888", marginBottom: 8 }}>
                loading sweeps ({sweepData.loaded.length}/{chain.sweeps.length}
                )...
              </div>
            )}
            {useSeparatePanels ? (
              <FamilySeparatePanels
                sweeps={sweepData.loaded}
                width={plotWidth}
                height={
                  plotHeight - timelineHeight - (sweepData.loading ? 24 : 0)
                }
                splitBy={
                  familyGroupBy as "protocol" | "condition" | "repetition"
                }
              />
            ) : (
              <FamilyOverlayPlot
                sweeps={sweepData.loaded}
                width={plotWidth}
                height={
                  plotHeight - timelineHeight - (sweepData.loading ? 24 : 0)
                }
                groupBy={familyGroupBy}
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
            groupBy={familyGroupBy}
          />
        )}
      </div>
    </div>
  );
};

export default IcephysTabView;
