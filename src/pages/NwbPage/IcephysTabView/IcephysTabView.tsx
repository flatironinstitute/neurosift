import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { getHdf5Group } from "../hdf5Interface";
import ConditionSelector from "./ConditionSelector";
import FamilyOverlayPlot from "./FamilyOverlayPlot";
import ProtocolSelector from "./ProtocolSelector";
import RepetitionSelector from "./RepetitionSelector";
import SweepSelector from "./SweepSelector";
import { ScopeSelection, useChain } from "./useChain";
import { useSweepData } from "./useSweepData";

interface IcephysTabViewProps {
  nwbUrl: string;
  width: number;
  height: number;
  isExpanded: boolean;
}

const SIDEBAR_WIDTH = 320;
const MAX_SWEEPS_AUTO = 60;

const IcephysTabView: FunctionComponent<IcephysTabViewProps> = ({
  nwbUrl,
  width,
  height,
  isExpanded,
}) => {
  const [hasIcephys, setHasIcephys] = useState<boolean | null>(null);
  const [scope, setScope] = useState<ScopeSelection>({});
  const [forceRender, setForceRender] = useState(false);

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
  const setSweepIrtRow = (v: number | undefined) =>
    setScope((s) => ({ ...s, sweepIrtRow: v }));

  const chain = useChain(nwbUrl, scope);

  const wouldRender = chain.sweeps.length;
  const exceedsCap = wouldRender > MAX_SWEEPS_AUTO && !forceRender;
  const sweepsToLoad = exceedsCap ? [] : chain.sweeps;
  const sweepData = useSweepData(nwbUrl, sweepsToLoad);

  // reset force-render whenever scope changes
  useEffect(() => {
    setForceRender(false);
  }, [scope.condRow, scope.repRow, scope.protoRow, scope.sweepIrtRow]);

  const plotWidth = useMemo(() => width - SIDEBAR_WIDTH - 32, [width]);
  const plotHeight = useMemo(() => height - 32, [height]);

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
        {/* Sweep is always available once the chain has any sweeps to drill into */}
        {chain.availableSweeps.length > 0 && (
          <SweepSelector
            availableSweeps={chain.availableSweeps}
            value={scope.sweepIrtRow}
            onChange={setSweepIrtRow}
          />
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

        {chain.error && (
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

        {!chain.loading && exceedsCap && (
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
              This selection would render {wouldRender} sweeps. To keep the tab
              responsive, the auto-render cap is {MAX_SWEEPS_AUTO}.
            </div>
            <button
              onClick={() => setForceRender(true)}
              style={{ marginTop: 8, padding: "4px 10px", fontSize: 12 }}
            >
              Render anyway
            </button>
          </div>
        )}

        {!chain.loading && !exceedsCap && (
          <>
            {sweepData.loading && (
              <div style={{ color: "#888", marginBottom: 8 }}>
                loading sweeps ({sweepData.loaded.length}/{chain.sweeps.length}
                )...
              </div>
            )}
            <FamilyOverlayPlot
              sweeps={sweepData.loaded}
              width={plotWidth}
              height={plotHeight - (sweepData.loading ? 24 : 0)}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default IcephysTabView;
