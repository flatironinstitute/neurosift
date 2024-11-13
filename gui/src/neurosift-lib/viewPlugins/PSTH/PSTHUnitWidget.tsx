/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import { DirectSpikeTrainsClient } from "../Units/DirectRasterPlotUnitsItemView";
import PSTHHistWidget from "./PSTHHistWidget";
import { PSTHPrefs, PSTHTrialAlignedSeriesMode } from "./PSTHItemView";
import PSTHRasterWidget from "./PSTHRasterWidget";
import { RoiClient } from "./ROIClient";
import TrialAlignedSeriesWidget from "./TrialAlignedSeriesWidget";

type Props = {
  width: number;
  height: number;
  path: string;
  spikeTrainsClient: DirectSpikeTrainsClient | undefined;
  roiClient: RoiClient | undefined;
  unitId: string | number;
  trialIndices: number[] | null | undefined;
  alignToVariables: string[];
  groupByVariable: string;
  groupByVariableCategories: string[] | undefined;
  windowRange: { start: number; end: number };
  prefs: PSTHPrefs;
  mode: PSTHTrialAlignedSeriesMode;
};

const PSTHUnitWidget: FunctionComponent<Props> = ({
  width,
  height,
  path,
  spikeTrainsClient,
  roiClient,
  unitId,
  trialIndices,
  alignToVariables,
  groupByVariable,
  groupByVariableCategories,
  windowRange,
  prefs,
  mode,
}) => {
  const topBarHeight = 40;
  const groupLegendWidth = groupByVariable ? 100 : 0;
  const W = (width - groupLegendWidth) / (alignToVariables.length || 1);

  const [spikeTrain, setSpikeTrain] = useState<number[] | undefined>(undefined);
  useEffect(() => {
    if (mode !== "psth") return;
    if (!spikeTrainsClient) {
      setSpikeTrain(undefined);
      return;
    }
    let canceled = false;
    const canceler: { onCancel: (() => void)[] } = { onCancel: [] };
    const load = async () => {
      const st = await spikeTrainsClient.getUnitSpikeTrain(unitId, {
        canceler,
      });
      if (canceled) return;
      setSpikeTrain(st);
    };
    load();
    return () => {
      canceled = true;
      canceler.onCancel.forEach((c) => c());
    };
  }, [spikeTrainsClient, unitId, mode]);

  const [roiData, setRoiData] = useState<number[] | undefined>(undefined);
  useEffect(() => {
    if (mode !== "time-aligned-series") return;
    if (!roiClient) {
      setRoiData(undefined);
      return;
    }
    let canceled = false;
    const load = async () => {
      await roiClient.waitForLoaded();
      if (canceled) return;
      if (!roiClient.roiData) return;
      const d = roiClient.roiData[unitId as number];
      setRoiData(d);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [roiClient, mode, unitId]);
  const [roiTimestamps, setRoiTimestamps] = useState<number[] | undefined>(
    undefined,
  );
  useEffect(() => {
    if (mode !== "time-aligned-series") return;
    if (!roiClient) {
      setRoiTimestamps(undefined);
      return;
    }
    let canceled = false;
    const load = async () => {
      await roiClient.waitForLoaded();
      if (canceled) return;
      setRoiTimestamps(roiClient.roiTimestamps);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [roiClient, mode]);

  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden" }}>
      <hr />
      <div
        style={{
          position: "absolute",
          width,
          height: topBarHeight,
          fontSize: 24,
          marginLeft: 30,
        }}
      >
        Unit {unitId}
      </div>
      {groupLegendWidth && (
        <div
          className="legend-container"
          style={{
            position: "absolute",
            width: groupLegendWidth,
            height: height - topBarHeight,
            top: topBarHeight,
            left: width - groupLegendWidth,
            overflow: "hidden",
          }}
        >
          <PSTHGroupLegend
            width={groupLegendWidth}
            height={height - topBarHeight}
            path={path}
            groupByVariable={groupByVariable}
            groupByVariableCategories={groupByVariableCategories}
            mode={mode}
          />
        </div>
      )}
      {(mode === "psth" && spikeTrain) ||
      (mode === "time-aligned-series" && roiData) ? (
        alignToVariables.map((alignToVariable, i) => (
          <div
            className="align-to-widget-container"
            key={alignToVariable}
            style={{
              position: "absolute",
              width: W,
              height: height - topBarHeight,
              top: topBarHeight,
              left: i * W,
            }}
          >
            {
              <PSTHUnitAlignToWidget
                width={W}
                height={height - topBarHeight}
                path={path}
                spikeTrain={spikeTrain}
                roiData={roiData}
                roiTimestamps={roiTimestamps}
                unitId={unitId}
                trialIndices={trialIndices}
                alignToVariable={alignToVariable}
                groupByVariable={groupByVariable}
                groupByVariableCategories={groupByVariableCategories}
                windowRange={windowRange}
                prefs={prefs}
                mode={mode}
              />
            }
          </div>
        ))
      ) : (
        <div
          style={{
            position: "absolute",
            width,
            height: height - topBarHeight,
            top: topBarHeight,
          }}
        >
          {mode === "psth" ? (
            <>Loading spike train...</>
          ) : mode === "time-aligned-series" ? (
            <>Loading series...</>
          ) : (
            <></>
          )}
        </div>
      )}
    </div>
  );
};

type PSTHUnitAlignToWidgetProps = {
  width: number;
  height: number;
  path: string;
  spikeTrain?: number[];
  roiData?: number[];
  roiTimestamps?: number[];
  unitId: string | number;
  trialIndices: number[] | null | undefined;
  alignToVariable: string;
  groupByVariable: string;
  groupByVariableCategories: string[] | undefined;
  windowRange: { start: number; end: number };
  prefs: PSTHPrefs;
  mode: PSTHTrialAlignedSeriesMode;
};

const PSTHUnitAlignToWidget: FunctionComponent<PSTHUnitAlignToWidgetProps> = ({
  width,
  height,
  path,
  spikeTrain,
  roiData,
  roiTimestamps,
  unitId,
  trialIndices,
  alignToVariable,
  groupByVariable,
  groupByVariableCategories,
  windowRange,
  prefs,
  mode,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: no nwbFile");

  const [alignToTimes, setAlignToTimes] = useState<number[] | undefined>(
    undefined,
  );
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const times = await nwbFile.getDatasetData(
        path + "/" + alignToVariable,
        {},
      );
      if (!times) throw Error(`Unable to load ${path}/${alignToVariable}`);
      if (canceled) return;
      const times2 = Array.from(times);
      setAlignToTimes(times2);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, path, alignToVariable, trialIndices]);

  const [groupByValues, setGroupByValues] = useState<any[] | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!groupByVariable) return;
    let canceled = false;
    const load = async () => {
      const vals = await nwbFile.getDatasetData(
        path + "/" + groupByVariable,
        {},
      );
      if (!vals) throw Error(`Unable to load ${path}/${groupByVariable}`);
      if (canceled) return;
      setGroupByValues(Array.from(vals));
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, path, groupByVariable, spikeTrain]);

  useEffect(() => {
    if (!groupByVariable && alignToTimes) {
      setGroupByValues(alignToTimes.map(() => undefined));
    }
  }, [groupByVariable, alignToTimes]);

  const trials:
    | { times: number[]; roiValues?: number[]; group: any }[]
    | undefined = useMemo(() => {
    if (!alignToTimes) return undefined;
    if (!groupByValues) return undefined;
    const t1 = windowRange.start;
    const t2 = windowRange.end;
    const ret: { times: number[]; roiValues?: number[]; group: any }[] = [];
    let i1 = 0;
    for (let iTrial = 0; iTrial < alignToTimes.length; iTrial++) {
      if (mode === "psth") {
        if (!spikeTrain) return undefined;
        while (
          i1 < spikeTrain.length &&
          spikeTrain[i1] < alignToTimes[iTrial] + t1
        ) {
          i1++;
        }
        let i2 = i1;
        while (
          i2 < spikeTrain.length &&
          spikeTrain[i2] < alignToTimes[iTrial] + t2
        ) {
          i2++;
        }
        ret.push({
          times: spikeTrain.slice(i1, i2).map((t) => t - alignToTimes[iTrial]),
          group: groupByValues[iTrial],
        });
      } else if (mode === "time-aligned-series") {
        if (!roiData) return undefined;
        if (!roiTimestamps) return undefined;
        while (
          i1 < roiTimestamps.length &&
          roiTimestamps[i1] < alignToTimes[iTrial] + t1
        ) {
          i1++;
        }
        let i2 = i1;
        while (
          i2 < roiTimestamps.length &&
          roiTimestamps[i2] < alignToTimes[iTrial] + t2
        ) {
          i2++;
        }
        ret.push({
          times: roiTimestamps
            .slice(i1, i2)
            .map((t) => t - alignToTimes[iTrial]),
          roiValues: roiData.slice(i1, i2),
          group: groupByValues[iTrial],
        });
      }
    }
    return ret;
  }, [
    alignToTimes,
    spikeTrain,
    roiData,
    roiTimestamps,
    mode,
    windowRange,
    groupByValues,
  ]);

  const groups: { group: any; color: string }[] | undefined = useMemo(() => {
    if (!trials) return undefined;
    const vals = trials.map((t) => t.group);
    const uniqueVals = Array.from(new Set(vals));
    uniqueVals.sort();
    const uniqueVals2 = groupByVariableCategories
      ? uniqueVals.filter((v) => groupByVariableCategories.includes(v + ""))
      : uniqueVals;
    const lighterMode = mode === "time-aligned-series";
    return uniqueVals2.map((val, i) => ({
      group: val,
      color: groupColorForIndex(i, lighterMode),
    }));
  }, [trials, groupByVariableCategories, mode]);

  const filteredTrials = useMemo(() => {
    if (!trials) return trials;
    if (!trialIndices) return trials;
    const trialIndicesSet = new Set(trialIndices);
    return trials.filter((trial, i) => trialIndicesSet.has(i));
  }, [trials, trialIndices]);

  const sortedFilteredTrials = useMemo(() => {
    if (!filteredTrials) return undefined;
    if (!groups) return undefined;
    const ret: { times: number[]; group: any }[] = [];
    groups.forEach((group) => {
      filteredTrials
        .filter((trial) => trial.group === group.group)
        .forEach((trial) => {
          ret.push(trial);
        });
    });
    return ret;
  }, [filteredTrials, groups]);

  if (!alignToTimes) {
    return <div>Loading alignment times...</div>;
  }

  if (!groupByValues) {
    return <div>Loading group values</div>;
  }

  if (!trials) {
    if (!roiData) {
      return <div>Loading roi data...</div>;
    }
    if (!roiTimestamps) {
      return <div>Loading roi timestamps...</div>;
    }
    if (!groupByValues) {
      return <div>Loading group values...</div>;
    }
    return <div>Loading trials...</div>;
  }

  if (!groups) {
    return <div>Loading groups...</div>;
  }

  if (!filteredTrials) {
    return <div>Loading filtered trials...</div>;
  }

  if (!sortedFilteredTrials) {
    return <div>Loading sorted filtered trials...</div>;
  }

  const titleHeight = 20;
  const rasterWidgetHeight = prefs.showRaster
    ? prefs.showHist
      ? (height - titleHeight) / 2
      : height - titleHeight
    : 0;
  const histWidgetHeight =
    prefs.showHist && mode === "psth"
      ? height - titleHeight - rasterWidgetHeight
      : 0;

  return (
    <div style={{ position: "absolute", width, height }}>
      <div
        className="align-to-variable"
        style={{
          position: "absolute",
          width,
          height: titleHeight,
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        {alignToVariable}
      </div>
      <div
        className="raster-widget-container"
        style={{
          position: "absolute",
          width,
          height: rasterWidgetHeight,
          top: titleHeight,
        }}
      >
        {prefs.showRaster &&
          (mode === "psth" ? (
            <PSTHRasterWidget
              width={width}
              height={rasterWidgetHeight}
              trials={sortedFilteredTrials}
              groups={groups}
              windowRange={windowRange}
              alignmentVariableName={alignToVariable}
              showXAxisLabels={!prefs.showHist} // don't show x axis labels if hist is shown
            />
          ) : mode === "time-aligned-series" ? (
            <TrialAlignedSeriesWidget
              width={width}
              height={rasterWidgetHeight}
              trials={sortedFilteredTrials}
              groups={groups}
              windowRange={windowRange}
              alignmentVariableName={alignToVariable}
            />
          ) : (
            <></>
          ))}
      </div>
      <div
        className="hist-widget-container"
        style={{
          position: "absolute",
          width,
          height: histWidgetHeight,
          top: titleHeight + rasterWidgetHeight,
        }}
      >
        {prefs.showHist && (
          <PSTHHistWidget
            width={width}
            height={histWidgetHeight}
            trials={sortedFilteredTrials}
            groups={groups}
            windowRange={windowRange}
            alignmentVariableName={alignToVariable}
            prefs={prefs}
          />
        )}
      </div>
    </div>
  );
};

type PSTHGroupLegendProps = {
  width: number;
  height: number;
  path: string;
  groupByVariable: string;
  groupByVariableCategories: string[] | undefined;
  mode: PSTHTrialAlignedSeriesMode;
};

const PSTHGroupLegend: FunctionComponent<PSTHGroupLegendProps> = ({
  width,
  height,
  path,
  groupByVariable,
  groupByVariableCategories,
  mode,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: no nwbFile");

  const [values, setValues] = useState<any[] | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const vals = await nwbFile.getDatasetData(
        path + "/" + groupByVariable,
        {},
      );
      if (!vals) throw Error(`Unable to load ${path}/${groupByVariable}`);
      if (canceled) return;
      let vv = Array.from(vals);
      if (groupByVariableCategories) {
        vv = vv.filter((v) => groupByVariableCategories.includes(v + ""));
      }
      setValues(Array.from(vv));
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, path, groupByVariable, groupByVariableCategories]);

  const groups: { group: any; color: string }[] = useMemo(() => {
    const vals = values;
    const uniqueVals = Array.from(new Set(vals));
    uniqueVals.sort();
    const lighterMode = mode === "time-aligned-series";
    return uniqueVals.map((val, i) => ({
      group: val,
      color: groupColorForIndex(i, lighterMode),
    }));
  }, [values, mode]);

  const itemHeight = 20;
  const itemWidth = 20;
  const margin = 5;

  if (!values) {
    return <div>Loading values...</div>;
  }

  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      {groups.map((g, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: itemWidth,
            height: itemHeight,
            top: i * (itemHeight + margin),
            left: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: itemWidth,
              height: itemHeight,
              backgroundColor: g.color,
            }}
          ></div>
          <div
            style={{
              position: "absolute",
              width: itemWidth,
              height: itemHeight,
              paddingLeft: itemWidth + 5,
              paddingTop: 2,
              fontSize: 12,
            }}
          >
            {<GroupLabel group={g} />}
          </div>
        </div>
      ))}
    </div>
  );
};

type GroupLabelProps = {
  group: { group: any; color: string };
};

const GroupLabel: FunctionComponent<GroupLabelProps> = ({ group }) => {
  if (!group) return <></>;
  else if (typeof group.group === "number") {
    return <>{group.group}</>;
  } else if (typeof group.group === "string") {
    return <>{group.group}</>;
  } else if (typeof group.group === "object") {
    if (group.group._REFERENCE) {
      return <>_REF</>;
    } else {
      return <>_OBJ</>;
    }
  } else {
    return <>?</>;
  }
};

const groupColors = [
  "black",
  "red",
  "green",
  "blue",
  "orange",
  "purple",
  "cyan",
  "magenta",
  "yellow",
  "pink",
  "brown",
  "gray",
];

const lighterGroupColors = [
  "#ccc",
  "#f00",
  "#0f0",
  "#00f",
  "#f80",
  "#80f",
  "#0ff",
  "#f0f",
  "#ff0",
];

const groupColorForIndex = (i: number, lighterMode: boolean) => {
  if (!lighterMode) {
    return groupColors[i % groupColors.length];
  } else {
    return lighterGroupColors[i % lighterGroupColors.length];
  }
};

export default PSTHUnitWidget;
