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

const EventsItemView: FunctionComponent<Props> = ({ width, height, path }) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const [spikeTrainsClient, setSpikeTrainsClient] = useState<
    EventsSpikeTrainsClient | undefined
  >(undefined);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const client = new EventsSpikeTrainsClient(nwbFile, path);
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
    return <div>Loading events...</div>;
  }

  return (
    <RasterPlotView3
      width={width}
      height={height}
      spikeTrainsClient={spikeTrainsClient}
      showUnitIds={false}
    />
  );
};

export class EventsSpikeTrainsClient {
  #timestamps: DatasetDataType | undefined;
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
    const timestampsData = await this.nwbFile.getDatasetData(
      `${path}/timestamps`,
      {},
    );
    if (!timestampsData)
      throw Error(
        `Unable to load timestamps data in EventsSpikeTrainsClient: ${path}/timestamps`,
      );

    this.#timestamps = timestampsData;

    this.#startTimeSec = timestampsData[0];
    this.#endTimeSec = timestampsData[timestampsData.length - 1];

    this.#spikeTrains = [];
    this.#spikeTrains!.push({
      spikeTrain: [],
      unitId: "0",
    });
    for (let i = 0; i < this.#timestamps.length; i++) {
      const t = this.#timestamps[i];
      this.#spikeTrains[0].spikeTrain.push(t);
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
    if (!this.#spikeTrains)
      throw Error("Unexpected: spikeTrains not initialized");
    return this.#spikeTrains.map((st) => st.unitId);
  }
  get totalNumSpikes() {
    if (!this.#timestamps) return undefined;
    return this.#timestamps.length;
  }
  numSpikesForUnit(unitId: number | string) {
    if (!this.#spikeTrains)
      throw Error("Unexpected: spikeTrains not initialized");
    const ii = this.unitIds.indexOf(unitId);
    return this.#spikeTrains[ii].spikeTrain.length;
  }
  async getData(
    blockStartIndex: number,
    blockEndIndex: number,
    options: { unitIds?: (number | string)[] } = {},
  ) {
    await this.initialize();
    if (!this.#spikeTrains)
      throw Error("Unexpected: spikeTrains not initialized");
    const ret: {
      unitId: number | string;
      spikeTimesSec: number[];
    }[] = [];
    const t1 = this.#startTimeSec! + blockStartIndex * this.#blockSizeSec;
    const t2 = this.#startTimeSec! + blockEndIndex * this.#blockSizeSec;
    for (let ii = 0; ii < this.unitIds.length; ii++) {
      if (options.unitIds) {
        if (!options.unitIds.includes(this.unitIds[ii])) continue;
      }
      ret.push({
        unitId: this.unitIds[ii],
        spikeTimesSec: this.#spikeTrains[ii].spikeTrain.filter(
          (t) => t >= t1 && t < t2,
        ),
      });
    }
    return ret;
  }
  async getUnitSpikeTrain(unitId: number | string) {
    await this.initialize();
    if (!this.#spikeTrains)
      throw Error("Unexpected: spikeTrains not initialized");
    const ii = this.unitIds.indexOf(unitId);
    return this.#spikeTrains[ii].spikeTrain;
  }
}

export default EventsItemView;
