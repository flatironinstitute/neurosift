/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  DatasetDataType,
  RemoteH5Dataset,
  RemoteH5FileX,
} from "../../../remote-h5-file/index";
import { useEffect, useState } from "react";
import { useGroup } from "../../../misc/hooks";

class TimestampFinder {
  #chunkSize = 100000;
  #chunks: { [key: number]: DatasetDataType } = {};
  constructor(
    private nwbFile: RemoteH5FileX,
    private timestampsDataset: RemoteH5Dataset,
    // private estimatedSamplingFrequency: number,
  ) {}
  async getDataIndexForTime(time: number): Promise<number> {
    let iLower = 0;
    let iUpper = this.timestampsDataset.shape[0] - 1;
    if (iUpper === iLower) return iLower;
    let tLower = await this._get(iLower);
    let tUpper = await this._get(iUpper);
    if (isNaN(tUpper)) {
      // sometimes the final timestamp is NaN, in that case use the second-to-last timestamp
      // this happens in a Frank Lab dataset: http://localhost:3000/neurosift/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/645/10d/64510d67-fab1-45ab-abc3-b18c9738412c
      tUpper = await this._get(iUpper - 1);
      iUpper = iUpper - 1;
    }
    while (iUpper - iLower > 1) {
      if (time < tLower) {
        return iLower;
      }
      if (time > tUpper) {
        return iUpper;
      }
      let estimatedIndex =
        iLower +
        Math.floor(((iUpper - iLower) * (time - tLower)) / (tUpper - tLower));
      if (estimatedIndex <= iLower)
        estimatedIndex = Math.floor((iUpper + iLower) / 2);
      if (estimatedIndex >= iUpper)
        estimatedIndex = Math.floor((iUpper + iLower) / 2);
      const estimatedT = await this._get(estimatedIndex);
      if (estimatedT === time) {
        return estimatedIndex;
      }
      if (estimatedT < time) {
        iLower = estimatedIndex;
        tLower = estimatedT;
      } else {
        iUpper = estimatedIndex;
        tUpper = estimatedT;
      }
    }
    const distToLower = Math.abs(time - tLower);
    const distToUpper = Math.abs(time - tUpper);
    if (distToLower < distToUpper) return iLower;
    else return iUpper;
  }
  async _get(i: number) {
    const chunkIndex = Math.floor(i / this.#chunkSize);
    if (!(chunkIndex in this.#chunks)) {
      const a1 = chunkIndex * this.#chunkSize;
      let a2 = (chunkIndex + 1) * this.#chunkSize;
      if (a2 > this.timestampsDataset.shape[0])
        a2 = this.timestampsDataset.shape[0];
      const chunk = await this.nwbFile.getDatasetData(
        this.timestampsDataset.path,
        { slice: [[a1, a2]] },
      );
      if (chunk) {
        this.#chunks[chunkIndex] = chunk;
      } else {
        console.warn("Unable to get chunk", chunkIndex);
      }
    }
    return this.#chunks[chunkIndex][i - chunkIndex * this.#chunkSize];
  }
}

class IrregularTimeseriesTimestampsClient {
  #estimatedSamplingFrequency: number | undefined = undefined;
  #startTime: number | undefined = undefined;
  #endTime: number | undefined = undefined;
  #timestampFinder: TimestampFinder | undefined = undefined;
  constructor(
    private nwbFile: RemoteH5FileX,
    private objectPath: string,
  ) {}
  async initialize() {
    const timestampsDataset = await this.nwbFile.getDataset(
      `${this.objectPath}/timestamps`,
    );
    if (!timestampsDataset)
      throw Error(
        `Unable to get timestamps dataset: ${this.objectPath}/timestamps`,
      );
    const numInitialTimestamps = Math.min(10000, timestampsDataset.shape[0]);
    const initialTimestamps = await this.getTimestampsForDataIndices(
      0,
      numInitialTimestamps,
    );
    const finalTimestamps = await this.getTimestampsForDataIndices(
      timestampsDataset.shape[0] - 10,
      timestampsDataset.shape[0],
    );
    if (!initialTimestamps)
      throw Error(
        `Unable to get initial timestamps: ${this.objectPath}/timestamps`,
      );
    if (!finalTimestamps)
      throw Error(
        `Unable to get final timestamps: ${this.objectPath}/timestamps`,
      );
    this.#estimatedSamplingFrequency =
      getEstimatedSamplingFrequencyFromTimestamps(initialTimestamps);
    this.#startTime = initialTimestamps[0];
    let endTime = finalTimestamps[finalTimestamps.length - 1];
    if (isNaN(endTime)) {
      // sometimes the final timestamp is NaN, in that case use the second-to-last timestamp
      // this happens in a Frank Lab dataset: http://localhost:3000/neurosift/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/645/10d/64510d67-fab1-45ab-abc3-b18c9738412c
      endTime = finalTimestamps[finalTimestamps.length - 2];
    }
    this.#endTime = endTime;
    this.#timestampFinder = new TimestampFinder(
      this.nwbFile,
      timestampsDataset,
      // this.#estimatedSamplingFrequency!,
    );
  }
  get startTime(): number | undefined {
    return this.#startTime;
  }
  get endTime(): number | undefined {
    return this.#endTime;
  }
  get estimatedSamplingFrequency(): number | undefined {
    return this.#estimatedSamplingFrequency;
  }
  async getDataIndexForTime(time: number): Promise<number> {
    return await this.#timestampFinder!.getDataIndexForTime(time);
  }
  async getTimestampsForDataIndices(
    i1: number,
    i2: number,
  ): Promise<DatasetDataType | undefined> {
    const ret = await this.nwbFile.getDatasetData(
      `${this.objectPath}/timestamps`,
      { slice: [[i1, i2]] },
    );
    if (!ret)
      throw Error(`Unable to get timestamps: ${this.objectPath}/timestamps`);
    return ret;
  }
}

class RegularTimeseriesTimestampsClient {
  #samplingFrequency: number | undefined = undefined;
  #startTime: number | undefined = undefined;
  #endTime: number | undefined = undefined;
  #dataShape: number[] | undefined = undefined;
  constructor(
    private nwbFile: RemoteH5FileX,
    private objectPath: string,
  ) {}
  async initialize() {
    const startingTimeDataset = await this.nwbFile.getDataset(
      `${this.objectPath}/starting_time`,
    );
    const startingTime = (await this.nwbFile.getDatasetData(
      `${this.objectPath}/starting_time`,
      {},
    )) as any as number;
    const dataDataset = await this.nwbFile.getDataset(
      `${this.objectPath}/data`,
    );
    if (!startingTimeDataset)
      throw Error(
        `Unable to get starting_time dataset: ${this.objectPath}/starting_time`,
      );
    if (!dataDataset)
      throw Error(`Unable to get data dataset: ${this.objectPath}/data`);
    this.#samplingFrequency =
      (startingTimeDataset.attrs["rate"] as number) || 1; // set to 1 in case of rate=0 to avoid division by zero
    this.#startTime = startingTime;
    this.#endTime =
      this.#startTime + dataDataset.shape[0] / this.#samplingFrequency;
    this.#dataShape = dataDataset.shape;
  }
  get startTime(): number | undefined {
    return this.#startTime;
  }
  get endTime(): number | undefined {
    return this.#endTime;
  }
  get estimatedSamplingFrequency(): number | undefined {
    return this.#samplingFrequency;
  }
  async getDataIndexForTime(time: number): Promise<number> {
    if (time < this.#startTime!) return 0;
    if (time >= this.#endTime!) return this.#dataShape![0] - 1;
    return Math.round((time - this.#startTime!) * this.#samplingFrequency!);
  }
  async getTimestampsForDataIndices(
    i1: number,
    i2: number,
  ): Promise<DatasetDataType> {
    const ret = new Float64Array(i2 - i1); // it's important that this is 64-bit float because for 32-bit we have insufficient precision for large values of i1/i2
    for (let i = i1; i < i2; i++) {
      ret[i - i1] = this.#startTime! + i / this.#samplingFrequency!;
    }
    return ret;
  }
}

export interface TimeseriesTimestampsClient {
  startTime: number | undefined;
  endTime: number | undefined;
  estimatedSamplingFrequency: number | undefined;
  getDataIndexForTime: (time: number) => Promise<number>;
  getTimestampsForDataIndices: (
    i1: number,
    i2: number,
  ) => Promise<DatasetDataType | undefined>;
}

export const useTimeseriesTimestampsClient = (
  nwbFile: RemoteH5FileX,
  objectPath: string,
) => {
  const group = useGroup(nwbFile, objectPath);
  const [dataClient, setDataClient] = useState<TimeseriesTimestampsClient>();
  useEffect(() => {
    if (!nwbFile) return;
    if (!group) return;
    let canceled = false;
    const load = async () => {
      if (group.datasets.find((ds) => ds.name === "timestamps")) {
        const client = new IrregularTimeseriesTimestampsClient(
          nwbFile,
          objectPath,
        );
        await client.initialize();
        if (canceled) return;
        setDataClient(client);
      } else {
        const client = new RegularTimeseriesTimestampsClient(
          nwbFile,
          objectPath,
        );
        await client.initialize();
        if (canceled) return;
        setDataClient(client);
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, objectPath, group]);
  return dataClient;
};

const getEstimatedSamplingFrequencyFromTimestamps = (
  timestamps: DatasetDataType,
): number => {
  if (timestamps.length < 2) return 1;
  const deltas: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    deltas.push(timestamps[i] - timestamps[i - 1]);
  }
  const sortedDeltas = deltas.sort((a, b) => a - b);
  const medianDelta = sortedDeltas[Math.floor(sortedDeltas.length / 2)];
  return 1 / medianDelta;
};
