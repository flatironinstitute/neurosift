/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useState } from "react";
import { RoiClient, TASPrefs } from "./TimeAlignedSeriesItemView";
import { RemoteH5FileX } from "@remote-h5-file/index";
import TimeAlignedSeriesPlot from "./TimeAlignedSeriesPlot";

type RoiWidgetProps = {
  width: number;
  height: number;
  nwbFile: RemoteH5FileX;
  timeIntervalsPath: string;
  roiClient: RoiClient;
  roiIndex: number;
  alignToVariables?: string[];
  windowRange: { start: number; end: number };
  prefs: TASPrefs;
};

const RoiWidget: FunctionComponent<RoiWidgetProps> = ({
  width,
  height,
  nwbFile,
  timeIntervalsPath,
  roiClient,
  roiIndex,
  alignToVariables,
  windowRange,
  prefs,
}) => {
  const topBarHeight = 40;
  const [roiData, setRoiData] = useState<number[][] | undefined>(undefined);
  useEffect(() => {
    roiClient.waitForLoaded().then(() => {
      setRoiData(roiClient.roiData);
    });
  }, [roiClient]);

  const [alignToTimes, setAlignToTimes] = useState<number[][] | undefined>(
    undefined,
  );
  useEffect(() => {
    let canceled = false;
    if (!alignToVariables) return;
    const load = async () => {
      const ret: number[][] = [];
      for (const alignToVariable of alignToVariables) {
        const times = await nwbFile.getDatasetData(
          timeIntervalsPath + "/" + alignToVariable,
          {},
        );
        if (!times)
          throw Error(`Unable to load ${timeIntervalsPath}/${alignToVariable}`);
        if (canceled) return;
        ret.push(times as any as number[]);
      }
      setAlignToTimes(ret);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, timeIntervalsPath, alignToVariables]);

  const groupLegendWidth = 0;
  const W = (width - groupLegendWidth) / (alignToVariables?.length || 1);
  const titleHeight = 30;
  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden" }}>
      <hr />
      <div
        style={{
          position: "absolute",
          width,
          height: topBarHeight,
          fontSize: 18,
          marginLeft: 30,
        }}
      >
        ROI {roiIndex}
      </div>
      {roiData && alignToTimes && alignToVariables ? (
        alignToVariables.map((alignToVariable, i) => (
          <div
            key={alignToVariable}
            style={{
              position: "absolute",
              width: W,
              height: height - topBarHeight,
              top: topBarHeight,
              left: i * W,
            }}
          >
            <div
              style={{
                position: "absolute",
                width: W,
                height: titleHeight,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              aligned to {alignToVariable}
            </div>
            <div
              style={{
                position: "absolute",
                width: W,
                height: height - topBarHeight,
                top: titleHeight,
              }}
            >
              <TimeAlignedSeriesPlot
                width={W}
                height={height - topBarHeight - titleHeight}
                alignToTimes={alignToTimes[i]}
                roiData={roiData[roiIndex]}
                roiTimestamps={roiClient.roiTimestamps}
                alignToVariable={alignToVariable}
                windowRange={windowRange}
                prefs={prefs}
              />
            </div>
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
          Loading data...
        </div>
      )}
    </div>
  );
};

export default RoiWidget;
