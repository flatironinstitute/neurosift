/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FunctionComponent, useEffect, useState } from "react";
import { AverageWaveformsView } from "./view-average-waveforms";
import {
  AverageWaveformData,
  AverageWaveformsViewData,
} from "./view-average-waveforms/AverageWaveformsViewData";
import { useNwbFile } from "../../misc/NwbFileContext";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const AverageWaveformsUnitsItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is null");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<AverageWaveformsViewData | undefined | null>(
    undefined,
  );

  useEffect(() => {
    const loadData = async () => {
      const group = await nwbFile.getGroup(path);
      if (!group) {
        setErrorMessage("Group not found");
        setData(null);
        return;
      }
      const unitIdDs = await nwbFile.getDataset(`${path}/id`);
      if (!unitIdDs) {
        setErrorMessage("id dataset not found");
        setData(null);
        return;
      }
      const unitIds = await nwbFile.getDatasetData(`${path}/id`, {});
      if (!unitIds) {
        setErrorMessage("Unable to load id data");
        setData(null);
        return;
      }
      const waveformsDs = await nwbFile.getDataset(`${path}/waveform_mean`);
      if (!waveformsDs) {
        setErrorMessage("waveform_mean dataset not found");
        setData(null);
        return;
      }
      const shape = [...waveformsDs.shape];
      if (shape.length < 2 || shape.length > 3) {
        setErrorMessage(
          `waveform_mean dataset has unexpected shape: ${JSON.stringify(shape)}`,
        );
        setData(null);
        return;
      }
      if (shape.length === 2) {
        shape.push(1);
      }
      const waveformsData = await nwbFile.getDatasetData(
        `${path}/waveform_mean`,
        {},
      );
      if (!waveformsData) {
        setErrorMessage("Unable to load waveform_mean data");
        setData(null);
        return;
      }

      const numUnits = shape[0];
      const numTimepoints = shape[1];
      const numChannels = shape[2];

      const averageWaveforms: AverageWaveformData[] = [];
      for (let i = 0; i < numUnits; i++) {
        const channelIds = Array.from(
          { length: numChannels },
          (_, i) => `index-${i}`,
        );
        const waveform = create2DArray(
          numTimepoints,
          numChannels,
          (waveformsData as any as number[]).slice(
            i * numTimepoints * numChannels,
            (i + 1) * numTimepoints * numChannels,
          ),
        );
        averageWaveforms.push({
          unitId: unitIds[i],
          channelIds,
          waveform,
          waveformStdDev: undefined,
        });
      }

      const data: AverageWaveformsViewData = {
        type: "AverageWaveforms",
        averageWaveforms,
        samplingFrequency: undefined,
        noiseLevel: undefined,
        channelLocations: undefined,
        showReferenceProbe: false,
      };
      setData(data);
    };
    loadData();
  }, [nwbFile, path]);

  if (data === undefined) {
    return <div>Loading average waveforms...</div>;
  }

  if (data === null) {
    return <div>Error loading average waveforms: {errorMessage}</div>;
  }

  return <AverageWaveformsView data={data} width={width} height={height} />;
};

const create2DArray = (
  rows: number,
  cols: number,
  data: number[],
): number[][] => {
  const arr: number[][] = [];
  for (let i = 0; i < rows; i++) {
    arr.push(data.slice(i * cols, (i + 1) * cols));
  }
  return arr;
};

export default AverageWaveformsUnitsItemView;
