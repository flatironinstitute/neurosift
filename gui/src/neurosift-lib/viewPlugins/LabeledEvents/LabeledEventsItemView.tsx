/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { DatasetDataType, RemoteH5FileX } from "../../remote-h5-file/index";
import { FunctionComponent, useEffect, useState } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import RasterPlotView3 from "../../views/RasterPlotView3/RasterPlotView3";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const LabeledEventsItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const [spikeTrainsClient, setSpikeTrainsClient] = useState<
    LabeledEventsSpikeTrainsClient | undefined
  >(undefined);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const client = new LabeledEventsSpikeTrainsClient(nwbFile, path);
      await client.initialize();
      if (canceled) return;
      setSpikeTrainsClient(client);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, path]);

  if (!spikeTrainsClient) {
    return <div>Loading spike trains...</div>;
  }

  return (
    <RasterPlotView3
      width={width}
      height={height}
      spikeTrainsClient={spikeTrainsClient}
    />
  );
};

export class LabeledEventsSpikeTrainsClient {
  #unitIds: any[] | undefined;
  #timestamps: DatasetDataType | undefined;
  #labels: number[] | undefined;
  #startTimeSec: number | undefined;
  #endTimeSec: number | undefined;
  #blockSizeSec = 60 * 5;
  #spikeTrains: { spikeTrain: number[]; unitId: number | string }[] | undefined;
  constructor(
    private nwbFile: RemoteH5FileX,
    private path: string,
  ) {}
  async initialize() {
    const path = this.path;
    const dataDataset = await this.nwbFile.getDataset(path + "/data");
    const timestampsData = await this.nwbFile.getDatasetData(
      `${path}/timestamps`,
      {},
    );
    const labelsData = await this.nwbFile.getDatasetData(`${path}/data`, {});

    if (!dataDataset)
      throw Error(
        `Unable to load data dataset in LabeledEventsSpikeTrainsClient: ${path}/data`,
      );
    if (!labelsData)
      throw Error(
        `Unable to load labels data in LabeledEventsSpikeTrainsClient: ${path}/data`,
      );
    if (!timestampsData)
      throw Error(
        `Unable to load timestamps data in LabeledEventsSpikeTrainsClient: ${path}/timestamps`,
      );

    const labelNames = dataDataset.attrs["labels"];

    this.#timestamps = timestampsData;
    this.#labels = Array.from(labelsData);

    this.#startTimeSec = timestampsData[0];
    this.#endTimeSec = timestampsData[timestampsData.length - 1];

    this.#unitIds = labelNames;

    this.#spikeTrains = [];
    this.#unitIds!.forEach((unitId, ii) => {
      this.#spikeTrains!.push({
        spikeTrain: [],
        unitId,
      });
    });
    for (let i = 0; i < this.#timestamps.length; i++) {
      const t = this.#timestamps[i];
      const label = this.#labels[i];
      this.#spikeTrains[label].spikeTrain.push(t);
    }
  }
  get startTimeSec() {
    return this.#startTimeSec;
  }
  get endTimeSec() {
    return this.#endTimeSec;
  }
  get blockSizeSec() {
    return this.#blockSizeSec;
  }
  get unitIds() {
    if (!this.#unitIds) throw Error("Unexpected: unitIds not initialized");
    return this.#unitIds;
  }
  get totalNumSpikes() {
    if (!this.#timestamps) return undefined;
    return this.#timestamps.length;
  }
  numSpikesForUnit(unitId: number | string) {
    if (!this.#unitIds) throw Error("Unexpected: unitIds not initialized");
    if (!this.#spikeTrains)
      throw Error("Unexpected: spikeTrains not initialized");
    const ii = this.#unitIds.indexOf(unitId);
    return this.#spikeTrains[ii].spikeTrain.length;
  }
  async getData(
    blockStartIndex: number,
    blockEndIndex: number,
    options: { unitIds?: (number | string)[] } = {},
  ) {
    await this.initialize();
    if (!this.#unitIds) throw Error("Unexpected: unitIds not initialized");
    if (!this.#spikeTrains)
      throw Error("Unexpected: spikeTrains not initialized");
    const ret: {
      unitId: number | string;
      spikeTimesSec: number[];
    }[] = [];
    const t1 = this.#startTimeSec! + blockStartIndex * this.#blockSizeSec;
    const t2 = this.#startTimeSec! + blockEndIndex * this.#blockSizeSec;
    for (let ii = 0; ii < this.#unitIds.length; ii++) {
      if (options.unitIds) {
        if (!options.unitIds.includes(this.#unitIds[ii])) continue;
      }
      ret.push({
        unitId: this.#unitIds[ii],
        spikeTimesSec: this.#spikeTrains[ii].spikeTrain.filter(
          (t) => t >= t1 && t < t2,
        ),
      });
    }
    return ret;
  }
  async getUnitSpikeTrain(unitId: number | string) {
    await this.initialize();
    if (!this.#unitIds) throw Error("Unexpected: unitIds not initialized");
    if (!this.#spikeTrains)
      throw Error("Unexpected: spikeTrains not initialized");
    const ii = this.#unitIds.indexOf(unitId);
    return this.#spikeTrains[ii].spikeTrain;
  }
}

export default LabeledEventsItemView;
