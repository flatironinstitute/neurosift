/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSSProperties, FunctionComponent } from "react";
import UnitSelectionComponent from "./UnitSelection";
import RoiSelectionComponent from "./RoiSelection";
import AlignToSelectionComponent from "./AlignToSelection";
import PrefsComponent from "./Preferences";
import WindowRangeComponent from "./WindowRange";
import GroupBySelectionComponent from "./GroupBySelection";
import GroupByCategoriesComponent from "./GroupByCategories";
import SortUnitsBySelectionComponent from "./SortUnitsBy";
import { useCategoriesForVariable } from "../hooks/useGroupByCategories";
import { DirectSpikeTrainsClient } from "../DirectSpikeTrainsClient";
import { RoiClient } from "../ROIClient";
import {
  PSTHPrefs,
  PSTHPrefsAction,
  PSTHTrialAlignedSeriesMode,
} from "../types";
import PSTHUnitWidget from "../PSTHUnitWidget";
import IfHasBeenVisible from "../IfHasBeenVisible";

const accordionSummaryStyle: CSSProperties = {
  cursor: "pointer",
  padding: "4px 8px",
  fontWeight: "bold",
  backgroundColor: "#34495e",
  color: "#fff",
  userSelect: "none",
};

type Props = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
  unitsPath: string;
  mode: PSTHTrialAlignedSeriesMode;
  spikeTrainsClient: DirectSpikeTrainsClient | undefined;
  roiClient: RoiClient | null; // Changed to match useRoiClient's return type
  sortedUnitIds: (number | string)[] | undefined;
  selectedUnitIds: (number | string)[];
  setSelectedUnitIds: (x: (number | string)[]) => void;
  selectedRoiIndices: number[];
  setSelectedRoiIndices: (x: number[]) => void;
  alignToVariables: string[];
  setAlignToVariables: (x: string[]) => void;
  groupByVariable: string;
  setGroupByVariable: (x: string) => void;
  groupByVariableCategories: string[] | undefined;
  setGroupByVariableCategories: (x: string[] | undefined) => void;
  sortUnitsByVariable: [string, "asc" | "desc"] | undefined;
  setSortUnitsByVariable: (x: [string, "asc" | "desc"] | undefined) => void;
  sortUnitsByValues: { [unitId: string | number]: any } | undefined;
  windowRangeStr: { start: string; end: string };
  setWindowRangeStr: (x: { start: string; end: string }) => void;
  prefs: PSTHPrefs;
  prefsDispatch: (action: PSTHPrefsAction) => void;
  trialIndices: number[] | undefined;
  unitIdsOrRoiIndicesToPlot: (number | string)[];
};

const PSTHLayout: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
  unitsPath,
  mode,
  spikeTrainsClient,
  roiClient,
  sortedUnitIds,
  selectedUnitIds,
  setSelectedUnitIds,
  selectedRoiIndices,
  setSelectedRoiIndices,
  alignToVariables,
  setAlignToVariables,
  groupByVariable,
  setGroupByVariable,
  groupByVariableCategories,
  setGroupByVariableCategories,
  sortUnitsByVariable,
  setSortUnitsByVariable,
  sortUnitsByValues,
  windowRangeStr,
  setWindowRangeStr,
  prefs,
  prefsDispatch,
  trialIndices,
  unitIdsOrRoiIndicesToPlot,
}) => {
  const unitsTableWidth = 250;

  const categoriesForGroupBy = useCategoriesForVariable(nwbUrl, path, groupByVariable);

  const unitWidgetHeight = Math.min(
    height,
    prefs.height === "small" ? 300 : prefs.height === "medium" ? 600 : 900,
  );

  const unitsTable =
    mode === "psth" ? (
      <UnitSelectionComponent
        unitIds={sortedUnitIds}
        selectedUnitIds={selectedUnitIds}
        setSelectedUnitIds={setSelectedUnitIds}
        sortUnitsByVariable={sortUnitsByVariable}
        sortUnitsByValues={sortUnitsByValues}
        spikeTrainsClient={spikeTrainsClient}
      />
    ) : mode === "time-aligned-series" ? (
      <RoiSelectionComponent
        roiClient={roiClient}
        selectedRoiIndices={selectedRoiIndices}
        setSelectedRoiIndices={setSelectedRoiIndices}
      />
    ) : null;

  return (
    <div
      className="PSTHItemView"
      style={{ position: "absolute", width, height, overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          width: unitsTableWidth,
          height,
          overflowY: "auto",
          overflowX: "hidden",
          fontSize: "0.75em",
        }}
      >
        <details open>
          <summary style={accordionSummaryStyle}>
            {mode === "psth" ? "Units" : "ROIs"}
          </summary>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {unitsTable}
          </div>
        </details>
        <div style={{ height: 6 }} />
        <details open>
          <summary style={accordionSummaryStyle}>Align to</summary>
          <AlignToSelectionComponent
            alignToVariables={alignToVariables}
            setAlignToVariables={setAlignToVariables}
            nwbUrl={nwbUrl}
            path={path}
          />
        </details>
        <div style={{ height: 6 }} />
        <details open>
          <summary style={accordionSummaryStyle}>Controls</summary>
          <div style={{ padding: "4px 8px" }}>
            <WindowRangeComponent
              windowRangeStr={windowRangeStr}
              setWindowRangeStr={setWindowRangeStr}
            />
            <br />
            <GroupBySelectionComponent
              groupByVariable={groupByVariable}
              setGroupByVariable={(v) => {
                setGroupByVariable(v);
                setGroupByVariableCategories(undefined);
              }}
              nwbUrl={nwbUrl}
              path={path}
            />
            {categoriesForGroupBy && (
              <>
                <div style={{ height: 6 }} />
                <details open>
                  <summary style={accordionSummaryStyle}>
                    Categories
                  </summary>
                  <GroupByCategoriesComponent
                    groupByVariableCategories={groupByVariableCategories}
                    setGroupByVariableCategories={setGroupByVariableCategories}
                    options={categoriesForGroupBy}
                  />
                </details>
              </>
            )}
            {mode === "psth" && (
              <>
                <br />
                <SortUnitsBySelectionComponent
                  sortUnitsByVariable={sortUnitsByVariable}
                  setSortUnitsByVariable={setSortUnitsByVariable}
                  nwbUrl={nwbUrl}
                  unitsPath={unitsPath}
                />
              </>
            )}
            <hr style={{ margin: "6px 0", borderColor: "#dde4ed" }} />
            <PrefsComponent
              prefs={prefs}
              prefsDispatch={prefsDispatch}
              mode={mode}
            />
          </div>
        </details>
      </div>
      <div
        className="psth-item-view-right"
        style={{
          position: "absolute",
          left: unitsTableWidth,
          width: width - unitsTableWidth,
          height,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {unitIdsOrRoiIndicesToPlot.map((unitIdOrRoiIndex, i) => (
          <div
            key={unitIdOrRoiIndex}
            style={{
              position: "absolute",
              top: i * unitWidgetHeight,
              width: width - unitsTableWidth,
              height: unitWidgetHeight,
            }}
          >
            <IfHasBeenVisible
              width={width - unitsTableWidth}
              height={unitWidgetHeight}
            >
              <PSTHUnitWidget
                width={width - unitsTableWidth - 20} // leave room for scrollbar
                height={unitWidgetHeight}
                nwbUrl={nwbUrl}
                path={path}
                spikeTrainsClient={spikeTrainsClient}
                roiClient={roiClient ?? undefined} // Convert null to undefined for PSTHUnitWidget
                unitId={unitIdOrRoiIndex}
                trialIndices={trialIndices}
                alignToVariables={alignToVariables}
                groupByVariable={groupByVariable}
                groupByVariableCategories={groupByVariableCategories}
                windowRange={{
                  start: parseFloat(windowRangeStr.start),
                  end: parseFloat(windowRangeStr.end),
                }}
                prefs={prefs}
                mode={mode}
              />
            </IfHasBeenVisible>
          </div>
        ))}
        {unitIdsOrRoiIndicesToPlot.length === 0 && (
          <div>
            Select one or more {mode === "psth" ? "units" : "ROIs"} to plot
          </div>
        )}
      </div>
    </div>
  );
};

export default PSTHLayout;
