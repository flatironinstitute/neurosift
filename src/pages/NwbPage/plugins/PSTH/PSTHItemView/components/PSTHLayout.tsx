/* eslint-disable @typescript-eslint/no-explicit-any */
import { AccordionItem, EmptyState, ViewPanel } from "@ui";
import { useCssVars } from "@components/useCssVars";
import LazyFrame from "@components/LazyFrame";
import { FunctionComponent, ReactNode, useState } from "react";
import "./PSTHControls.css";
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
  const settingsWidth = 352;
  const plotWidth = Math.max(width - settingsWidth, 320);
  const categoriesForGroupBy = useCategoriesForVariable(
    nwbUrl,
    path,
    groupByVariable,
  );
  const [open, setOpen] = useState({
    units: true,
    align: true,
    controls: true,
    categories: true,
    sort: false,
    display: false,
  });
  const section = (key: keyof typeof open) => ({
    open: open[key],
    onToggle: (o: boolean) => setOpen((prev) => ({ ...prev, [key]: o })),
  });
  const unitWidgetHeight = Math.min(
    height,
    prefs.height === "small" ? 300 : prefs.height === "medium" ? 600 : 900,
  );
  const noun = mode === "psth" ? "unit" : "ROI";
  const total =
    mode === "psth"
      ? (sortedUnitIds?.length ?? 0)
      : (roiClient?.getRoiIndices().length ?? 0);
  const picked =
    mode === "psth" ? selectedUnitIds.length : selectedRoiIndices.length;
  const pickedText = `${picked} of ${total} ${noun}s`;
  const windowText = `${windowRangeStr.start} to ${windowRangeStr.end} s · ${prefs.numBins} bins`;
  const summary = [
    pickedText,
    alignToVariables.length > 0
      ? `aligned to ${alignToVariables.join(" and ")}`
      : "not aligned yet",
    groupByVariable && `grouped by ${groupByVariable}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const pickFirst = () => {
    if (mode === "psth") setSelectedUnitIds((sortedUnitIds ?? []).slice(0, 5));
    else setSelectedRoiIndices((roiClient?.getRoiIndices() ?? []).slice(0, 5));
  };

  return (
    <ViewPanel
      label={mode === "psth" ? "PSTH" : "Trial-aligned series"}
      summary={summary}
      controls={null}
      settings={
        <>
          <AccordionItem
            title={mode === "psth" ? "Units" : "ROIs"}
            summary={`${picked} of ${total} selected`}
            {...section("units")}
          >
            {mode === "psth" ? (
              <UnitSelectionComponent
                unitIds={sortedUnitIds}
                selectedUnitIds={selectedUnitIds}
                setSelectedUnitIds={setSelectedUnitIds}
                sortUnitsByVariable={sortUnitsByVariable}
                sortUnitsByValues={sortUnitsByValues}
                spikeTrainsClient={spikeTrainsClient}
              />
            ) : (
              <RoiSelectionComponent
                roiClient={roiClient}
                selectedRoiIndices={selectedRoiIndices}
                setSelectedRoiIndices={setSelectedRoiIndices}
              />
            )}
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
              path={path}
            />
          </AccordionItem>
          <AccordionItem
            title="Controls"
            summary={windowText}
            {...section("controls")}
          >
            <WindowRangeComponent
              windowRangeStr={windowRangeStr}
              setWindowRangeStr={setWindowRangeStr}
            />
          </AccordionItem>
          <AccordionItem
            title="Categories"
            summary={groupByVariable || "None"}
            {...section("categories")}
          >
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
              <GroupByCategoriesComponent
                groupByVariableCategories={groupByVariableCategories}
                setGroupByVariableCategories={setGroupByVariableCategories}
                options={categoriesForGroupBy}
              />
            )}
          </AccordionItem>
          {mode === "psth" && (
            <AccordionItem
              title="Sort units by"
              summary={sortUnitsByVariable?.[0] || "None"}
              {...section("sort")}
            >
              <SortUnitsBySelectionComponent
                sortUnitsByVariable={sortUnitsByVariable}
                setSortUnitsByVariable={setSortUnitsByVariable}
                nwbUrl={nwbUrl}
                unitsPath={unitsPath}
              />
            </AccordionItem>
          )}
          <AccordionItem
            title="Display"
            summary={[
              prefs.showRaster && "Raster",
              mode === "psth" && prefs.showHist && "histogram",
            ]
              .filter(Boolean)
              .join(" and ")}
            {...section("display")}
          >
            <PrefsComponent
              prefs={prefs}
              prefsDispatch={prefsDispatch}
              mode={mode}
            />
          </AccordionItem>
        </>
      }
    >
      {unitIdsOrRoiIndicesToPlot.length === 0 ? (
        <EmptyState
          title={`No ${noun}s chosen yet`}
          action={
            total > 0
              ? { label: `Select first 5 ${noun}s`, onClick: pickFirst }
              : undefined
          }
        >
          {`Pick ${noun}s in ${mode === "psth" ? "Units" : "ROIs"} to plot them, one chart each. This table has ${total} ${noun}${total === 1 ? "" : "s"}.`}
        </EmptyState>
      ) : (
        <div className="psth-charts">
          {unitIdsOrRoiIndicesToPlot.map((unitIdOrRoiIndex) => (
            <PSTHChart key={unitIdOrRoiIndex} height={unitWidgetHeight}>
              <LazyFrame className="psth-chart-frame">
                <PSTHUnitWidget
                  width={plotWidth - 20}
                  height={unitWidgetHeight}
                  nwbUrl={nwbUrl}
                  path={path}
                  spikeTrainsClient={spikeTrainsClient}
                  roiClient={roiClient ?? undefined}
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
              </LazyFrame>
            </PSTHChart>
          ))}
        </div>
      )}
    </ViewPanel>
  );
};

/** One unit's charts, at the chosen height. */
const PSTHChart: FunctionComponent<{ height: number; children: ReactNode }> = ({
  height,
  children,
}) => {
  const ref = useCssVars<HTMLDivElement>({ "--chart-h": height });
  return (
    <div ref={ref} className="psth-chart">
      {children}
    </div>
  );
};

export default PSTHLayout;
